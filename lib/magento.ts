import { oauthHeader, percentEncode } from "./oauth";
import { isJunkValue, SPEC_ATTRIBUTES, TEXT_ATTRIBUTES } from "./specs";
import type { Product, Spec } from "./types";

/**
 * Produktsøgning direkte mod Magento 2 (prototype-fase).
 *
 * 1. /V1/search  -> Magentos egen OpenSearch-søgning (hurtig, relevans-sorteret id-liste)
 * 2. /V1/products -> henter data for de fundne id'er i ét kald (kun de felter vi bruger)
 * 3. /V1/inventory/source-items -> lager pr. leverandør-kilde for alle kandidater i ét kald
 *
 * Senere (fase 2) kan dette erstattes af et dedikeret søgeindeks med embeddings,
 * uden at chat-delen skal ændres: den kalder kun searchProducts().
 */

const cfg = {
  url: (process.env.MAGENTO_URL || "").trim().replace(/\/+$/, ""),
  token: (process.env.MAGENTO_TOKEN || "").trim(),
  consumerKey: (process.env.MAGENTO_CONSUMER_KEY || "").trim(),
  consumerSecret: (process.env.MAGENTO_CONSUMER_SECRET || "").trim(),
  accessTokenSecret: (process.env.MAGENTO_ACCESS_TOKEN_SECRET || "").trim(),
  // Tom = butikkens standard-storeview (/rest/V1/...), som kundeservice-appen bruger.
  store: (process.env.MAGENTO_STORE_CODE || "").trim(),
  urlSuffix: process.env.MAGENTO_URL_SUFFIX ?? ".html",
  shopUrl: (process.env.SHOP_URL || process.env.MAGENTO_URL || "").replace(/\/$/, ""),
  // Magento-priser er typisk ekskl. moms i admin. Sæt til "true" hvis katalogpriserne er inkl. moms.
  pricesInclVat: process.env.MAGENTO_PRICES_INCLUDE_VAT === "true",
};

export const magentoConfigured = Boolean(cfg.url && cfg.token);
const useOAuth = Boolean(cfg.consumerKey && cfg.consumerSecret && cfg.accessTokenSecret);

/** Til /api/health: hvilken host og godkendelse der bruges (ingen hemmeligheder). */
export function magentoInfo() {
  let host = "";
  try {
    host = cfg.url ? new URL(cfg.url).host : "";
  } catch {
    host = "ugyldig MAGENTO_URL";
  }
  return { host, auth: useOAuth ? "oauth" : "bearer", store: cfg.store || "(standard)" };
}

// Hvor mange pladser et ikke-lagerført produkt rykkes ned i rangeringen.
// Lagervarer prioriteres, men et meget præcist match på en bestillingsvare forsvinder ikke.
const OUT_OF_STOCK_PENALTY = 8;
const CANDIDATES = 40;

async function mget<T>(path: string, query: Record<string, string | number> = {}, timeoutMs = 4000): Promise<T> {
  const q: Record<string, string> = Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]));
  const base = `${cfg.url}/rest${cfg.store ? `/${cfg.store}` : ""}/V1${path}`;
  const qs = Object.entries(q)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join("&");
  const auth = useOAuth
    ? oauthHeader("GET", base, { ...cfg, accessToken: cfg.token }, q)
    : `Bearer ${cfg.token}`;

  const res = await fetch(qs ? `${base}?${qs}` : base, {
    headers: { Authorization: auth, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(
      `Magento omdirigerer ${path} til ${res.headers.get("location") || "?"} – ret MAGENTO_URL til den adresse`,
    );
  }
  if (!res.ok) {
    // Magentos egen fejltekst (fx manglende rettigheder) – aldrig selve tokenet.
    const raw = await res.text().catch(() => "");
    let detail = "";
    try {
      const body = JSON.parse(raw) as { message?: string; parameters?: Record<string, string> | string[] };
      detail = body.message || "";
      const params = body.parameters;
      if (params && !Array.isArray(params)) {
        for (const [k, v] of Object.entries(params)) detail = detail.replace(`%${k}`, String(v));
      } else if (Array.isArray(params)) {
        params.forEach((v, i) => (detail = detail.replace(`%${i + 1}`, String(v))));
      }
    } catch {
      // Ikke JSON (fx en firewall- eller vedligeholdelsesside): vis lidt af teksten.
      detail = stripHtml(raw, 160);
    }
    const server = res.headers.get("server");
    throw new Error(
      `Magento ${res.status} på ${path}${server ? ` (server: ${server})` : ""}${detail ? `: ${detail}` : ""}`,
    );
  }
  return res.json() as Promise<T>;
}

/** Forbindelsestest uden søgning: henter ét varenummer (kræver kun produktrettigheder). */
export async function magentoPing(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t = Date.now();
  try {
    await mget<unknown>("/products", { "searchCriteria[pageSize]": 1, fields: "items[sku]" });
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: (e as Error).message };
  }
}

// ---------- Præcisions-sortering ----------

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[”"″'’]+/g, " ")
    .replace(/(\d)\.(\d\/\d)/g, "$1 $2") // 1.1/4 -> 1 1/4
    .replace(/(\d)\s*mm\b/g, "$1mm")
    .replace(/\s+/g, " ");

/**
 * Point pr. produkt: dimensioner (3/4, 1 1/4, 22mm, dn20) tæller meget, og et forkert
 * dimensionsmatch trækker ned. Almindelige ord giver et lille plus. Hele tal i grupper,
 * så "3/4" ikke matcher "1 3/4".
 */
function matchScorer(query: string) {
  const q = norm(query);
  const dims = [...q.matchAll(/(?:\b\d+ )?\b\d+\/\d+\b|\b\d+mm\b|\bdn ?\d+\b/g)].map((m) => m[0].replace(/^dn /, "dn"));
  const words = q
    .replace(/(?:\b\d+ )?\b\d+\/\d+\b|\b\d+mm\b|\bdn ?\d+\b/g, " ")
    .split(/[\s,.;:()]+/)
    .filter((w) => w.length > 2);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dimRe = dims.map((d) => new RegExp(`(?<![\\d/])(?<!\\d )${esc(d)}(?![\\d/])`));

  return (p: Product): number => {
    const hay = norm(`${p.name} ${(p.specs || []).map((s) => s.value).join(" ")}`);
    let score = 0;
    if (dims.length) {
      const hits = dimRe.filter((re) => re.test(hay)).length;
      // Har produktet en anden tomme-dimension og ingen af de søgte, er det sandsynligvis forkert.
      score += hits * 3 - (hits === 0 && /\b\d+\/\d+\b/.test(hay) ? 2 : 0);
    }
    for (const w of words) if (hay.includes(w)) score += 1;
    return score;
  };
}

// ---------- Tekniske attributter ----------

const LABEL_TTL_MS = 6 * 60 * 60 * 1000;
let labelCache: { at: number; promise: Promise<Map<string, Map<string, string>>> } | null = null;

/** option-id -> label for de udvalgte select-attributter. Hentes én gang pr. server-instans. */
function getOptionLabels(): Promise<Map<string, Map<string, string>>> {
  if (labelCache && Date.now() - labelCache.at < LABEL_TTL_MS) return labelCache.promise;
  const promise = (async () => {
    const res = await mget<{ items?: { attribute_code: string; options?: { label: string; value: string }[] }[] }>(
      "/products/attributes",
      {
        "searchCriteria[filterGroups][0][filters][0][field]": "attribute_code",
        "searchCriteria[filterGroups][0][filters][0][value]": SPEC_ATTRIBUTES.map((a) => a.code).join(","),
        "searchCriteria[filterGroups][0][filters][0][condition_type]": "in",
        "searchCriteria[pageSize]": 100,
        fields: "items[attribute_code,options[label,value]]",
      },
      8000,
    );
    const map = new Map<string, Map<string, string>>();
    for (const a of res.items || []) {
      map.set(a.attribute_code, new Map((a.options || []).map((o) => [String(o.value), o.label])));
    }
    return map;
  })();
  labelCache = { at: Date.now(), promise };
  promise.catch(() => (labelCache = null)); // prøv igen næste gang ved fejl
  return promise;
}

function readSpecs(p: MagentoProduct, labels: Map<string, Map<string, string>>): Spec[] {
  const out: Spec[] = [];
  for (const a of SPEC_ATTRIBUTES) {
    const raw = p.custom_attributes?.find((x) => x.attribute_code === a.code)?.value;
    if (raw == null || raw === "") continue;
    const opts = labels.get(a.code);
    const value = String(raw)
      .split(",")
      .map((id) => opts?.get(id.trim()) ?? (opts ? "" : id.trim()))
      .filter((v) => v && !isJunkValue(v))
      .join(", ");
    if (value) out.push({ label: a.label, value, card: Boolean(a.card) });
  }
  for (const a of TEXT_ATTRIBUTES) {
    const raw = attr(p, a.code);
    if (raw && !isJunkValue(raw)) out.push({ label: a.label, value: stripHtml(raw, 140), card: false });
  }
  return out;
}

type MagentoAttribute = {
  attribute_code: string;
  default_frontend_label?: string;
  frontend_input?: string;
  is_user_defined?: boolean;
  is_filterable?: string | boolean;
  is_filterable_in_search?: string | boolean;
  is_searchable?: string | boolean;
  is_visible_on_front?: string | boolean;
  options?: { label: string; value: string }[];
};

/** Alle brugerdefinerede produktattributter med nøgletal (til opsætning). */
export async function magentoAttributes() {
  const res = await mget<{ items?: MagentoAttribute[] }>(
    "/products/attributes",
    {
      "searchCriteria[pageSize]": 1000,
      fields:
        "items[attribute_code,default_frontend_label,frontend_input,is_user_defined,is_filterable,is_filterable_in_search,is_searchable,is_visible_on_front,options]",
    },
    15000,
  );
  const yes = (v: unknown) => v === true || v === "1" || v === 1;
  return (res.items || [])
    .filter((a) => yes(a.is_user_defined))
    .map((a) => ({
      code: a.attribute_code,
      label: a.default_frontend_label || "",
      type: a.frontend_input || "",
      filter: yes(a.is_filterable) || yes(a.is_filterable_in_search),
      search: yes(a.is_searchable),
      front: yes(a.is_visible_on_front),
      options: (a.options || []).filter((o) => o.value !== "").length,
      examples: (a.options || [])
        .filter((o) => o.value !== "")
        .slice(0, 6)
        .map((o) => o.label),
    }))
    .sort((a, b) => Number(b.filter) - Number(a.filter) || b.options - a.options);
}

type SourceItem ={ sku: string; source_code: string; quantity: number; status: number };
type SearchResponse = { items?: { id: number; score?: number }[]; total_count?: number };
type MagentoProduct = {
  id: number;
  sku: string;
  name: string;
  price?: number;
  custom_attributes?: { attribute_code: string; value: unknown }[];
  extension_attributes?: { stock_item?: { qty?: number; is_in_stock?: boolean } };
};

function attr(p: MagentoProduct, code: string): string | null {
  const a = p.custom_attributes?.find((x) => x.attribute_code === code);
  return a && typeof a.value === "string" ? a.value : null;
}

export function stripHtml(html: string, max = 180): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export type Timings = { search: number; products: number; salable: number };

export async function magentoSearch(
  query: string,
): Promise<{ total: number; products: Product[]; timings: Timings; debug?: Record<string, unknown> }> {
  const timings: Timings = { search: 0, products: 0, salable: 0 };
  let t = Date.now();
  const lap = (k: keyof Timings) => {
    timings[k] = Date.now() - t;
    t = Date.now();
  };

  // Option-labels til attributterne hentes parallelt (caches i hukommelsen).
  const labelsPromise = getOptionLabels().catch(() => new Map<string, Map<string, string>>());

  // 1. Relevans-søgning i Magentos søgeindeks
  const search = await mget<SearchResponse>("/search", {
    "searchCriteria[requestName]": "quick_search_container",
    "searchCriteria[filterGroups][0][filters][0][field]": "search_term",
    "searchCriteria[filterGroups][0][filters][0][value]": query,
    "searchCriteria[pageSize]": CANDIDATES,
    "searchCriteria[currentPage]": 1,
  });
  lap("search");
  const ids = (search.items || []).map((i) => i.id);
  if (ids.length === 0) return { total: 0, products: [], timings };

  // 2. Produktdata for alle kandidater i ét kald
  const fields =
    "items[id,sku,name,price,custom_attributes[attribute_code,value]]";
  const list = await mget<{ items?: MagentoProduct[] }>("/products", {
    "searchCriteria[filterGroups][0][filters][0][field]": "entity_id",
    "searchCriteria[filterGroups][0][filters][0][value]": ids.join(","),
    "searchCriteria[filterGroups][0][filters][0][condition_type]": "in",
    "searchCriteria[pageSize]": CANDIDATES,
    fields,
  });
  const labels = await labelsPromise;
  lap("products");
  const byId = new Map((list.items || []).map((p) => [p.id, p]));

  const vat = cfg.pricesInclVat ? 1 : 1.25;
  let products: (Product & { rank: number })[] = ids
    .map((id, rank): (Product & { rank: number }) | null => {
      const p = byId.get(id);
      if (!p) return null;
      const image = attr(p, "small_image") || attr(p, "image") || attr(p, "thumbnail");
      const urlKey = attr(p, "url_key");
      const stock = p.extension_attributes?.stock_item;
      const text = attr(p, "short_description") || attr(p, "description") || "";
      return {
        rank,
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: typeof p.price === "number" && p.price > 0 ? Math.round(p.price * vat * 100) / 100 : null,
        image: image && image !== "no_selection" ? `${cfg.shopUrl}/media/catalog/product${image}` : null,
        url: urlKey ? `${cfg.shopUrl}/${urlKey}${cfg.urlSuffix}` : `${cfg.shopUrl}/catalogsearch/result/?q=${encodeURIComponent(p.sku)}`,
        short: stripHtml(text),
        inStock: Boolean(stock?.is_in_stock && (stock.qty ?? 0) > 0),
        qty: typeof stock?.qty === "number" ? stock.qty : null,
        specs: readSpecs(p, labels),
      };
    })
    .filter((p): p is Product & { rank: number } => p !== null);

  // Ekstra præcision: Magentos søgning skelner dårligt mellem fx 3/4" og 1/4".
  // Produkter der matcher kundens dimensioner og ord (i navn eller egenskaber) rykkes frem.
  const match = matchScorer(query);
  const scores = new Map(products.map((p) => [p.sku, match(p)]));
  const sort = () =>
    products.sort(
      (a, b) =>
        (scores.get(b.sku) || 0) - (scores.get(a.sku) || 0) ||
        a.rank + (a.inStock ? 0 : OUT_OF_STOCK_PENALTY) - (b.rank + (b.inStock ? 0 : OUT_OF_STOCK_PENALTY)),
    );
  sort();

  // 3. Lager fra MSI source-items (én pr. leverandør-kilde) – ét samlet kald for alle kandidater.
  //    Lagervare = mindst én aktiv kilde (status 1) med antal > 0.
  //    Ingen source-item for en SKU = ingen kilde fører varen (ikke en fejl).
  const debug: Record<string, unknown> = { labelAttributes: labels.size };
  try {
    const skus = products.map((p) => p.sku);
    const src = await mget<{ items?: SourceItem[] }>(
      "/inventory/source-items",
      {
        "searchCriteria[filterGroups][0][filters][0][field]": "sku",
        "searchCriteria[filterGroups][0][filters][0][value]": skus.join(","),
        "searchCriteria[filterGroups][0][filters][0][condition_type]": "in",
        "searchCriteria[pageSize]": skus.length * 8,
      },
      2500,
    );
    const qtyBySku = new Map<string, number>();
    for (const s of src.items || []) {
      if (s.status !== 1) continue;
      qtyBySku.set(s.sku, (qtyBySku.get(s.sku) || 0) + Math.max(0, Number(s.quantity) || 0));
    }
    for (const p of products) {
      const q = qtyBySku.get(p.sku) ?? 0;
      p.qty = q;
      p.inStock = q > 0;
    }
    debug.sourceItems = src.items?.length ?? 0;
    debug.sources = [...new Set((src.items || []).map((s) => s.source_code))];
  } catch (e) {
    // Lagerdata utilgængelige: behold rækkefølgen fra søgningen, marker ikke noget som udsolgt.
    debug.stockError = (e as Error).message;
    for (const p of products) {
      p.qty = null;
      p.inStock = false;
    }
  }
  sort();
  lap("salable");

  return {
    total: search.total_count ?? ids.length,
    products: products.map(({ rank: _rank, ...p }) => p),
    timings,
    debug,
  };
}

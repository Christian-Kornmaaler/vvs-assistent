import type { Product } from "./types";

/**
 * Produktsøgning direkte mod Magento 2 (prototype-fase).
 *
 * 1. /V1/search  -> Magentos egen OpenSearch-søgning (hurtig, relevans-sorteret id-liste)
 * 2. /V1/products -> henter data for de fundne id'er i ét kald (kun de felter vi bruger)
 * 3. MSI salable qty for de øverste resultater (parallelt, med timeout)
 *
 * Senere (fase 2) kan dette erstattes af et dedikeret søgeindeks med embeddings,
 * uden at chat-delen skal ændres: den kalder kun searchProducts().
 */

const cfg = {
  url: (process.env.MAGENTO_URL || "").replace(/\/$/, ""),
  token: process.env.MAGENTO_TOKEN || "",
  store: process.env.MAGENTO_STORE_CODE || "default",
  stockId: process.env.MAGENTO_STOCK_ID || "1",
  urlSuffix: process.env.MAGENTO_URL_SUFFIX ?? ".html",
  shopUrl: (process.env.SHOP_URL || process.env.MAGENTO_URL || "").replace(/\/$/, ""),
  // Magento-priser er typisk ekskl. moms i admin. Sæt til "true" hvis katalogpriserne er inkl. moms.
  pricesInclVat: process.env.MAGENTO_PRICES_INCLUDE_VAT === "true",
};

export const magentoConfigured = Boolean(cfg.url && cfg.token);

// Hvor mange pladser et ikke-lagerført produkt rykkes ned i rangeringen.
// Lagervarer prioriteres, men et meget præcist match på en bestillingsvare forsvinder ikke.
const OUT_OF_STOCK_PENALTY = 8;
const CANDIDATES = 40;
const VERIFY_TOP = 10;

async function mget<T>(path: string, timeoutMs = 4000): Promise<T> {
  const res = await fetch(`${cfg.url}/rest/${cfg.store}${path}`, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Magento ${res.status} på ${path.split("?")[0]}`);
  return res.json() as Promise<T>;
}

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

function qs(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export type Timings = { search: number; products: number; salable: number };

export async function magentoSearch(
  query: string,
): Promise<{ total: number; products: Product[]; timings: Timings }> {
  const timings: Timings = { search: 0, products: 0, salable: 0 };
  let t = Date.now();
  const lap = (k: keyof Timings) => {
    timings[k] = Date.now() - t;
    t = Date.now();
  };

  // 1. Relevans-søgning i Magentos søgeindeks
  const search = await mget<SearchResponse>(
    `/V1/search?${qs({
      "searchCriteria[requestName]": "quick_search_container",
      "searchCriteria[filterGroups][0][filters][0][field]": "search_term",
      "searchCriteria[filterGroups][0][filters][0][value]": query,
      "searchCriteria[pageSize]": CANDIDATES,
      "searchCriteria[currentPage]": 1,
    })}`,
  );
  lap("search");
  const ids = (search.items || []).map((i) => i.id);
  if (ids.length === 0) return { total: 0, products: [], timings };

  // 2. Produktdata for alle kandidater i ét kald
  const fields =
    "items[id,sku,name,price,custom_attributes[attribute_code,value],extension_attributes[stock_item[qty,is_in_stock]]]";
  const list = await mget<{ items?: MagentoProduct[] }>(
    `/V1/products?${qs({
      "searchCriteria[filterGroups][0][filters][0][field]": "entity_id",
      "searchCriteria[filterGroups][0][filters][0][value]": ids.join(","),
      "searchCriteria[filterGroups][0][filters][0][condition_type]": "in",
      "searchCriteria[pageSize]": CANDIDATES,
      fields,
    })}`,
  );
  lap("products");
  const byId = new Map((list.items || []).map((p) => [p.id, p]));

  const vat = cfg.pricesInclVat ? 1 : 1.25;
  let products: (Product & { rank: number })[] = ids
    .map((id, rank) => {
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
      };
    })
    .filter((p): p is Product & { rank: number } => p !== null);

  const sort = () =>
    products.sort(
      (a, b) => a.rank + (a.inStock ? 0 : OUT_OF_STOCK_PENALTY) - (b.rank + (b.inStock ? 0 : OUT_OF_STOCK_PENALTY)),
    );
  sort();

  // 3. Bekræft MSI salable qty for de øverste (tager reservationer med). Falder tilbage på lagerfeltet ved timeout.
  await Promise.all(
    products.slice(0, VERIFY_TOP).map(async (p) => {
      try {
        const qty = await mget<number>(
          `/V1/inventory/get-product-salable-qty/${encodeURIComponent(p.sku)}/${cfg.stockId}`,
          1200,
        );
        if (typeof qty === "number") {
          p.qty = qty;
          p.inStock = qty > 0;
        }
      } catch {
        /* behold værdien fra stock_item */
      }
    }),
  );
  sort();
  lap("salable");

  return {
    total: search.total_count ?? ids.length,
    products: products.map(({ rank: _rank, ...p }) => p),
    timings,
  };
}

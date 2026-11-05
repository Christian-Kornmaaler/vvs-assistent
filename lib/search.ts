import { demoSearch } from "./demo-catalog";
import { magentoConfigured, magentoSearch, PAGE_SIZE } from "./magento";
import { headWord, queryVariants } from "./query-variants";
import type { Product, SearchResult } from "./types";

// Kort cache i hukommelsen: samme søgning inden for 2 minutter svares med det samme.
const TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { at: number; value: SearchResult }>();

/** Højeste side der kan hentes ved scroll (40 pr. side → 1.000 varer). */
export const MAX_PAGE = 25;

type Raw = { total: number; products: Product[]; timings?: SearchResult["timings"]; debug?: SearchResult["debug"] };

async function run(query: string, page = 1): Promise<Raw> {
  if (magentoConfigured) return (await magentoSearch(query, page)) as Raw;
  return page === 1 ? (demoSearch(query) as Raw) : { total: 0, products: [] };
}

function remember(key: string, value: SearchResult) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
}

/**
 * Første side af en søgning (bruges af AI'en). Giver den 0 resultater, prøves
 * varianter parallelt (synonymer, sammensatte ord splittet, hovedord).
 */
export async function searchProducts(query: string): Promise<SearchResult> {
  const key = `${query.trim().toLowerCase()}|1`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.value, ms: 0 };

  const t0 = Date.now();
  let r = await run(query);
  let usedQuery = query;

  // Vælg den variant, hvor flest af de øverste produkter faktisk indeholder variantens
  // hovedord, så fx "vinkel stophane" ikke vinder med en masse vinkelfittings.
  if (r.total === 0) {
    const variants = queryVariants(query);
    if (variants.length) {
      const results = await Promise.all(variants.map((v) => run(v).catch(() => null)));
      let best = -1;
      let bestScore = -1;
      results.forEach((x, i) => {
        if (!x || x.total === 0) return;
        const head = headWord(variants[i]);
        const hits = head ? x.products.slice(0, 8).filter((p) => p.name.toLowerCase().includes(head)).length : 0;
        if (hits > bestScore) {
          best = i;
          bestScore = hits;
        }
      });
      if (best >= 0) {
        r = results[best]!;
        usedQuery = variants[best];
      }
    }
  }

  const value: SearchResult = {
    query,
    usedQuery: usedQuery !== query ? usedQuery : undefined,
    total: r.total,
    page: 1,
    hasMore: magentoConfigured && r.total > PAGE_SIZE,
    products: r.products,
    ms: Date.now() - t0,
    source: magentoConfigured ? "magento" : "demo",
    timings: r.timings,
    debug: r.debug,
  };
  remember(key, value);
  // Gem også under den brugte variant, så scroll-siderne kan genbruge den.
  if (value.usedQuery) remember(`${value.usedQuery.trim().toLowerCase()}|1`, { ...value, query: value.usedQuery });
  return value;
}

/** Næste sider ved scroll i produktlisten (ingen varianter: forespørgslen er allerede afgjort). */
export async function searchPage(query: string, page: number): Promise<SearchResult> {
  const p = Math.min(Math.max(1, Math.floor(page)), MAX_PAGE);
  const key = `${query.trim().toLowerCase()}|${p}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.value, ms: 0 };

  const t0 = Date.now();
  const r = await run(query, p);
  const value: SearchResult = {
    query,
    total: r.total,
    page: p,
    hasMore: magentoConfigured && p < MAX_PAGE && p * PAGE_SIZE < r.total,
    products: r.products,
    ms: Date.now() - t0,
    source: magentoConfigured ? "magento" : "demo",
  };
  remember(key, value);
  return value;
}

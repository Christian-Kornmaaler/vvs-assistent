import { demoSearch } from "./demo-catalog";
import { magentoConfigured, magentoSearch } from "./magento";
import type { SearchResult } from "./types";

// Kort cache i hukommelsen: samme søgning inden for 2 minutter svares med det samme.
const TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { at: number; value: SearchResult }>();

export async function searchProducts(query: string, limit = 8): Promise<SearchResult> {
  const key = `${query.trim().toLowerCase()}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.value, ms: 0 };

  const t0 = Date.now();
  const source = magentoConfigured ? "magento" : "demo";
  const r = magentoConfigured ? await magentoSearch(query) : demoSearch(query);
  const value: SearchResult = {
    query,
    total: r.total,
    products: r.products.slice(0, limit),
    ms: Date.now() - t0,
    source,
    timings: "timings" in r ? (r.timings as SearchResult["timings"]) : undefined,
    debug: "debug" in r ? (r.debug as SearchResult["debug"]) : undefined,
  };

  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
}

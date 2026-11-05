import { demoSearch } from "./demo-catalog";
import { magentoConfigured, magentoSearch } from "./magento";
import { queryVariants } from "./query-variants";
import type { Product, SearchResult } from "./types";

// Kort cache i hukommelsen: samme søgning inden for 2 minutter svares med det samme.
const TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { at: number; value: SearchResult }>();

type Raw = { total: number; products: Product[]; timings?: SearchResult["timings"]; debug?: SearchResult["debug"] };

async function run(query: string): Promise<Raw> {
  return magentoConfigured ? ((await magentoSearch(query)) as Raw) : (demoSearch(query) as Raw);
}

export async function searchProducts(query: string, limit = 8): Promise<SearchResult> {
  const key = `${query.trim().toLowerCase()}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.value, ms: 0 };

  const t0 = Date.now();
  const source = magentoConfigured ? "magento" : "demo";
  let r = await run(query);
  let usedQuery = query;

  // Ingen resultater: prøv varianter parallelt (sammensatte ord splittet, kun hovedord …)
  // og brug den første i prioriteret rækkefølge, der giver noget.
  if (r.total === 0) {
    const variants = queryVariants(query);
    if (variants.length) {
      const results = await Promise.all(variants.map((v) => run(v).catch(() => null)));
      const idx = results.findIndex((x) => x && x.total > 0);
      if (idx >= 0) {
        r = results[idx]!;
        usedQuery = variants[idx];
      }
    }
  }

  const value: SearchResult = {
    query,
    usedQuery: usedQuery !== query ? usedQuery : undefined,
    total: r.total,
    products: r.products.slice(0, limit),
    ms: Date.now() - t0,
    source,
    timings: r.timings,
    debug: r.debug,
  };

  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
}

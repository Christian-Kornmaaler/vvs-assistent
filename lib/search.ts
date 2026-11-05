import { demoSearch } from "./demo-catalog";
import { magentoConfigured, magentoSearch } from "./magento";
import { headWord, queryVariants } from "./query-variants";
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

  // Ingen resultater: prøv varianter parallelt (sammensatte ord splittet, kun hovedord …).
  // Vælg den variant, hvor flest af de viste produkter faktisk indeholder hovedordet
  // (fx "stophane"), så "vinkel stophane" ikke vinder med en masse vinkelfittings.
  if (r.total === 0) {
    const variants = queryVariants(query);
    const head = headWord(query);
    if (variants.length) {
      const results = await Promise.all(variants.map((v) => run(v).catch(() => null)));
      let best = -1;
      let bestScore = -1;
      results.forEach((x, i) => {
        if (!x || x.total === 0) return;
        const hits = head
          ? x.products.slice(0, limit).filter((p) => p.name.toLowerCase().includes(head)).length
          : 0;
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

// MIDLERTIDIG: måler shoppens egne søgeadresser fra Vercel. Fjernes igen.
export const maxDuration = 30;
async function probe(url: string, headers: Record<string, string> = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 vvs-assistent-probe", ...headers }, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const ids = [...new Set([...text.matchAll(/data-product-id="(\d+)"|"product_id":"?(\d+)|name="product" value="(\d+)"/g)].map((m) => m[1] || m[2] || m[3]))];
    const skus = [...new Set([...text.matchAll(/data-product-sku="([^"]+)"/g)].map((m) => m[1]))];
    return { url, status: res.status, finalUrl: res.url, ms: Date.now() - t0, type: res.headers.get("content-type"), bytes: text.length, cache: res.headers.get("x-ph-static-cache") || res.headers.get("x-magento-cache-debug") || res.headers.get("age"), ids: ids.slice(0, 20), idCount: ids.length, skus: skus.slice(0, 5), head: text.replace(/\s+/g, " ").slice(0, 300) };
  } catch (e) {
    return { url, ms: Date.now() - t0, error: (e as Error).message };
  }
}
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "pakgarn";
  const b = "https://vvsfittings.dk";
  const xhr = { "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/javascript, */*; q=0.01" };
  const results = await Promise.all([
    probe(`${b}/amasty_xsearch/autocomplete/index/?q=${encodeURIComponent(q)}`, xhr),
    probe(`${b}/search/ajax/suggest/?q=${encodeURIComponent(q)}`, xhr),
    probe(`${b}/search/${encodeURIComponent(q)}`),
    probe(`${b}/catalogsearch/result/?q=${encodeURIComponent(q)}`),
  ]);
  // anden runde for at se cachet hastighed
  const again = await probe(`${b}/search/${encodeURIComponent(q)}`);
  return Response.json({ q, results, again }, { headers: { "Cache-Control": "no-store" } });
}

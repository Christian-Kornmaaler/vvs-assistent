import { debugAllowed, notFound } from "@/lib/debug";
// MIDLERTIDIG: tester om shoppens søgning slipper forbi bot-filteret. Fjernes igen.
export const maxDuration = 30;
async function probe(label: string, url: string, headers: Record<string, string>) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "vvs-assistent/1.0 (+https://assistent.vvsfittings.dk)", ...headers }, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const title = text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
    const bot = /not a bot/i.test(text);
    const skus = [...new Set([...text.matchAll(/data-product-sku="([^"]+)"|"sku"\s*:\s*"([^"]+)"/g)].map((m) => m[1] || m[2]))];
    const pakgarn = (text.match(/pakgarn/gi) || []).length;
    return { label, url, status: res.status, finalUrl: res.url, ms: Date.now() - t0, type: res.headers.get("content-type"), bytes: text.length, title, bot, pakgarn, skus: skus.slice(0, 8) };
  } catch (e) {
    return { label, url, ms: Date.now() - t0, error: (e as Error).message };
  }
}
export async function GET(req: Request) {
  if (!debugAllowed(req)) return notFound();
  const key = process.env.SHOP_SEARCH_KEY?.trim() || "";
  const b = "https://vvsfittings.dk";
  const site = { Referer: "https://assistent.vvsfittings.dk/", Origin: "https://assistent.vvsfittings.dk" };
  const withKey: Record<string, string> = key ? { "X-Assistant-Key": key } : {};
  const xhr = { "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/javascript, */*; q=0.01" };
  const results = await Promise.all([
    probe("ingen ekstra headers", `${b}/search/pakgarn`, {}),
    probe("Referer/Origin assistent", `${b}/search/pakgarn`, site),
    probe("nøgle", `${b}/search/pakgarn`, withKey),
    probe("nøgle + Referer", `${b}/search/pakgarn`, { ...withKey, ...site }),
    probe("nøgle + Referer, catalogsearch", `${b}/catalogsearch/result/?q=pakgarn`, { ...withKey, ...site }),
  ]);
  return Response.json({ keySet: key.length > 0, results }, { headers: { "Cache-Control": "no-store" } });
}

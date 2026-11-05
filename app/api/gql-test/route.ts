import { rateLimited } from "@/lib/rate-limit";

export const maxDuration = 20;

// Midlertidig test: virker shoppens GraphQL, og hvor hurtig er en søgning med filtre/aggregeringer?
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return new Response("For mange forespørgsler.", { status: 429 });
  const q = new URL(req.url).searchParams.get("q") || "kuglehane 3/4";
  const base = (process.env.MAGENTO_URL || "").trim().replace(/\/+$/, "");

  const query = `query($q:String!){products(search:$q,pageSize:8){total_count items{sku name stock_status url_key small_image{url} price_range{minimum_price{final_price{value currency}}}} aggregations{attribute_code label count options{label value count}}}}`;

  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { q } }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ikke JSON */
    }
    const data = json as {
      data?: { products?: { total_count: number; items: unknown[]; aggregations?: { attribute_code: string; label: string; count: number; options: unknown[] }[] } };
      errors?: { message: string }[];
    } | null;
    return Response.json(
      {
        status: res.status,
        ms: Date.now() - t0,
        errors: data?.errors?.map((e) => e.message) ?? null,
        total: data?.data?.products?.total_count ?? null,
        items: data?.data?.products?.items ?? null,
        aggregations: data?.data?.products?.aggregations?.map((a) => ({
          code: a.attribute_code,
          label: a.label,
          options: a.count,
          top: (a.options as { label: string; count: number }[]).slice(0, 5).map((o) => `${o.label} (${o.count})`),
        })),
        raw: json ? null : text.slice(0, 300),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json({ status: null, ms: Date.now() - t0, error: (e as Error).message });
  }
}

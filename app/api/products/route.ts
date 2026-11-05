import { rateLimited } from "@/lib/rate-limit";
import { MAX_PAGE, searchPage } from "@/lib/search";

export const maxDuration = 20;

// Flere resultater ved scroll i produktlisten: /api/products?q=kuglehane&page=2
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return Response.json({ ok: false, error: "rate" }, { status: 429 });

  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 120) || "";
  const page = Number(params.get("page") || "2");
  if (q.length < 2 || !Number.isFinite(page) || page < 1 || page > MAX_PAGE) {
    return Response.json({ ok: false, error: "ugyldig forespørgsel" }, { status: 400 });
  }
  try {
    const r = await searchPage(q, page);
    return Response.json(
      { ok: true, page: r.page, hasMore: r.hasMore, total: r.total, products: r.products },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e) {
    console.error("products page fejl:", (e as Error).message);
    return Response.json({ ok: false, error: "midlertidig fejl" }, { status: 502 });
  }
}

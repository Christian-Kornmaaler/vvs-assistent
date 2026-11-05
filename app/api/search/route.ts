import { debugAllowed, notFound } from "@/lib/debug";
import { rateLimited } from "@/lib/rate-limit";
import { searchProducts } from "@/lib/search";

// Test af produktsøgningen uden AI: /api/search?q=kuglehane
// Viser de samme data som produktkortene + tid pr. trin. Kun offentlige katalogdata.
export async function GET(req: Request) {
  if (!debugAllowed(req)) return notFound();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return new Response("For mange forespørgsler.", { status: 429 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 120) || "";
  // Svarer altid 200 med { ok }, så fejlen kan læses i en almindelig browser/fetch.
  if (q.length < 2) return Response.json({ ok: false, error: "Brug ?q=søgeord" });

  try {
    const r = await searchProducts(q);
    return Response.json(
      { ok: true, ...r, shown: r.products.length, products: r.products.slice(0, 12) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    return Response.json(
      { ok: false, error: err.message, cause: err.cause?.code || err.cause?.message || null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

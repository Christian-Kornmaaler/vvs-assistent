import { rateLimited } from "@/lib/rate-limit";
import { searchProducts } from "@/lib/search";

// Test af produktsøgningen uden AI: /api/search?q=kuglehane
// Viser de samme data som produktkortene + tid pr. trin. Kun offentlige katalogdata.
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return new Response("For mange forespørgsler.", { status: 429 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 120) || "";
  if (q.length < 2) return Response.json({ error: "Brug ?q=søgeord" }, { status: 400 });

  try {
    const r = await searchProducts(q, 8);
    return Response.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

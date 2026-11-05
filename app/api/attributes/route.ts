import { magentoAttributes } from "@/lib/magento";
import { rateLimited } from "@/lib/rate-limit";

// Oversigt over produktattributter (kode, navn, type, filtrerbar). Kun til opsætning.
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return new Response("For mange forespørgsler.", { status: 429 });
  try {
    const attrs = await magentoAttributes();
    return Response.json({ ok: true, count: attrs.length, attributes: attrs }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message });
  }
}

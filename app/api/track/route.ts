import { after } from "next/server";
import { rateLimited } from "@/lib/rate-limit";
import { sendEvents, validId, type TrackEvent } from "@/lib/track";

// Hændelser fra browseren: åbning af assistenten og klik på produkter.
// Søgninger registreres på serveren i /api/chat (de kan ikke forfalskes herfra).
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return new Response(null, { status: 204 });

  let body: Partial<TrackEvent>;
  try {
    body = (await req.json()) as Partial<TrackEvent>;
  } catch {
    return new Response(null, { status: 400 });
  }
  if ((body.type !== "open" && body.type !== "click") || !validId(body.visitor) || !validId(body.session)) {
    return new Response(null, { status: 400 });
  }
  const ev: TrackEvent = {
    type: body.type,
    visitor: body.visitor,
    session: body.session,
    at: new Date().toISOString(),
    query: typeof body.query === "string" ? body.query.slice(0, 200) : null,
    sku: typeof body.sku === "string" ? body.sku.slice(0, 64) : null,
    productName: typeof body.productName === "string" ? body.productName.slice(0, 300) : null,
    position: typeof body.position === "number" ? body.position : null,
    price: typeof body.price === "number" ? body.price : null,
    inStock: typeof body.inStock === "boolean" ? body.inStock : null,
    page: typeof body.page === "string" ? body.page.slice(0, 300) : null,
  };
  after(() => sendEvents([ev]));
  return new Response(null, { status: 204 });
}

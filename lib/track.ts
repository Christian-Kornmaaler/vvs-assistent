/**
 * Brugsstatistik: sendes videre til kundeservice-appen (Marked → Produktassistent).
 * Gemmer INGEN chatbeskeder eller personoplysninger: kun et anonymt besøgs-id,
 * søgeordene assistenten søgte på, antal fund og hvilke produkter der blev klikket på.
 *
 * Kræver ASSISTANT_INGEST_URL (fx https://support.vvsfittings.dk/api/assistant-events)
 * og ASSISTANT_INGEST_SECRET (samme værdi som i kundeservice-appen). Mangler de, sker der intet.
 */

export type TrackEvent = {
  type: "open" | "search" | "click";
  visitor: string;
  session: string;
  at?: string;
  query?: string | null;
  usedQuery?: string | null;
  total?: number | null;
  sku?: string | null;
  productName?: string | null;
  position?: number | null;
  price?: number | null;
  inStock?: boolean | null;
  page?: string | null;
};

const ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
export const validId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);

export async function sendEvents(events: TrackEvent[]): Promise<void> {
  const url = process.env.ASSISTANT_INGEST_URL;
  const secret = process.env.ASSISTANT_INGEST_SECRET;
  if (!url || !secret || events.length === 0) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ingest-secret": secret },
      body: JSON.stringify({ events: events.slice(0, 50) }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error("tracking afvist:", res.status);
  } catch (e) {
    // Statistik må aldrig påvirke kunden; fejl logges kun.
    console.error("tracking fejl:", (e as Error).message);
  }
}

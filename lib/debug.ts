/**
 * Fejlsøgnings-endpoints er lukkede i drift. De åbnes kun, hvis miljøvariablen
 * DEBUG_KEY er sat på Vercel OG forespørgslen har ?key=<samme værdi>.
 */
export function debugAllowed(req: Request): boolean {
  const key = process.env.DEBUG_KEY?.trim();
  if (!key || key.length < 12) return false;
  return new URL(req.url).searchParams.get("key")?.trim() === key;
}

export const notFound = () => new Response("Not found", { status: 404 });

/** Til /api/health: om fejlsøgningsnøglen er sat (værdien vises aldrig). */
export const debugConfigured = () => (process.env.DEBUG_KEY?.trim().length ?? 0) >= 12;

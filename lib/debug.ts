/**
 * Fejlsøgnings-endpoints er lukkede i drift. De åbnes kun, hvis miljøvariablen
 * DEBUG_KEY er sat på Vercel OG forespørgslen har ?key=<samme værdi>.
 */
export function debugAllowed(req: Request): boolean {
  const key = process.env.DEBUG_KEY;
  if (!key || key.length < 12) return false;
  return new URL(req.url).searchParams.get("key") === key;
}

export const notFound = () => new Response("Not found", { status: 404 });

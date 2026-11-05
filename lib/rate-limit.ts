// Simpel begrænsning pr. IP i hukommelsen (prototype). Skift til fx Upstash/Vercel KV i drift.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 40;
const hits = new Map<string, number[]>();

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return list.length > MAX_REQUESTS;
}

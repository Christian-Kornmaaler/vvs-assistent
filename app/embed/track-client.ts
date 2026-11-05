"use client";

/**
 * Anonyme id'er til statistik (ingen personoplysninger):
 * - visitor: tilfældigt id gemt i browseren, så samme kunde tælles som én bruger
 * - session: nyt id hver gang assistenten åbnes på en side (= én samtale)
 */
const rid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  ).replace(/[^a-zA-Z0-9-]/g, "");

let visitorId: string | null = null;
export function getVisitor(): string {
  if (visitorId) return visitorId;
  try {
    visitorId = localStorage.getItem("vvs-assistent-visitor");
    if (!visitorId) {
      visitorId = rid();
      localStorage.setItem("vvs-assistent-visitor", visitorId);
    }
  } catch {
    visitorId = rid(); // fx privat vindue uden lager: tælles pr. sidevisning
  }
  return visitorId;
}

const sessionId = typeof window !== "undefined" ? rid() : "server-render";
export const getSession = () => sessionId;

export function track(event: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({ ...event, visitor: getVisitor(), session: getSession() });
    const blob = new Blob([payload], { type: "application/json" });
    // sendBeacon overlever, at kunden navigerer væk ved klik på et produkt.
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* statistik må aldrig forstyrre kunden */
  }
}

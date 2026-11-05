import { debugAllowed, notFound } from "@/lib/debug";
import { generateText } from "ai";
import { chatSettings } from "@/lib/chat";
import { getModel } from "@/lib/model";
import { rateLimited } from "@/lib/rate-limit";

export const maxDuration = 30;

// Fejlsøgning: kører én hel dialog-tur på serveren. /api/chat-test?q=jeg+skal+bruge+en+kuglehane
export async function GET(req: Request) {
  if (!debugAllowed(req)) return notFound();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) return new Response("For mange forespørgsler.", { status: 429 });
  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.slice(0, 300) || "Jeg skal bruge en kuglehane";
  const effort = ["none", "minimal", "low", "medium"].includes(params.get("effort") || "")
    ? (params.get("effort") as string)
    : undefined;

  const t0 = Date.now();
  const { provider, id } = getModel();
  try {
    const r = await generateText(chatSettings([{ role: "user", content: q }], effort));
    return Response.json(
      {
        ok: true,
        model: `${provider}/${id}`,
        effort: effort || process.env.AI_REASONING_EFFORT || "low",
        ms: Date.now() - t0,
        finishReason: r.finishReason,
        text: r.text,
        reply: r.steps.flatMap((st) => st.toolCalls).map((c) => (c.input as { reply?: string }).reply).filter(Boolean).at(-1) ?? null,
        steps: r.steps.map((s) => ({
          finishReason: s.finishReason,
          toolCalls: s.toolCalls.map((c) => c.input),
          products: s.toolResults.map((t) => {
            const o = t.output as { products?: { name: string }[]; error?: string };
            return o.error ? `FEJL: ${o.error}` : (o.products || []).map((p) => p.name).slice(0, 3);
          }),
          text: s.text.slice(0, 300),
          usage: s.usage,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const err = e as Error & { responseBody?: string; statusCode?: number };
    return Response.json({
      ok: false,
      model: `${provider}/${id}`,
      ms: Date.now() - t0,
      error: err.message,
      status: err.statusCode ?? null,
      body: err.responseBody?.slice(0, 500) ?? null,
    });
  }
}

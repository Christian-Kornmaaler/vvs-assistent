import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { aiConfigured, getModel } from "@/lib/model";
import { INSTRUCTIONS } from "@/lib/prompt";
import { rateLimited } from "@/lib/rate-limit";
import { searchProducts } from "@/lib/search";

export const maxDuration = 30;

const tools = {
  search_products: tool({
    description:
      "Søg i webshoppens produktkatalog. Returnerer de bedst matchende produkter med lagerstatus; lagervarer er prioriteret. Resultaterne vises automatisk for kunden.",
    inputSchema: z.object({
      query: z.string().min(2).max(120).describe("Korte søgeord, fx 'kuglehane 3/4' eller 'pressfitting knæ 22 mm'"),
    }),
    execute: async ({ query }) => {
      try {
        return await searchProducts(query, 8);
      } catch (e) {
        return { query, total: 0, products: [], ms: 0, source: "magento" as const, error: (e as Error).message };
      }
    },
    // Modellen får en kompakt tekstudgave (hurtigere og billigere); UI'et får de fulde data.
    toModelOutput: ({ output }) => {
      if ("error" in output && output.error) return { type: "text", value: `Søgefejl: ${output.error}` };
      if (output.products.length === 0) return { type: "text", value: `Ingen resultater for "${output.query}".` };
      const lines = output.products.map(
        (p, i) =>
          `${i + 1}. ${p.name} | varenr ${p.sku} | ${p.price != null ? `${p.price.toFixed(2)} kr` : "pris ukendt"} | ${p.inStock ? "på lager" : "bestillingsvare"}${p.short ? ` | ${p.short}` : ""}`,
      );
      return {
        type: "text",
        value: `${output.total} resultater for "${output.query}". Viser kunden disse:\n${lines.join("\n")}`,
      };
    },
  }),
};

export type ChatTools = typeof tools;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "ukendt";
  if (rateLimited(ip)) {
    return new Response("For mange forespørgsler. Prøv igen om lidt.", { status: 429 });
  }
  if (!aiConfigured()) {
    return new Response("AI-nøgle mangler (ANTHROPIC_API_KEY eller OPENAI_API_KEY).", { status: 503 });
  }

  const body = (await req.json()) as { messages?: UIMessage[] };
  // Hold samtalen kort: de seneste 12 beskeder, og afvis meget lange beskeder.
  const messages = (body.messages || []).slice(-12);
  const last = messages.at(-1);
  const lastText = last?.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "";
  if (lastText.length > 1000) return new Response("Beskeden er for lang.", { status: 413 });

  const { model } = getModel();
  const result = streamText({
    model,
    instructions: INSTRUCTIONS,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(4),
    maxOutputTokens: 400,
  });

  return result.toUIMessageStreamResponse();
}

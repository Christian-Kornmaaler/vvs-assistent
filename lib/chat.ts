import { stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { getModel } from "./model";
import { INSTRUCTIONS } from "./prompt";
import { searchProducts } from "./search";

export const tools = {
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
        console.error("search_products fejl:", (e as Error).message);
        return { query, total: 0, products: [], ms: 0, source: "magento" as const, error: (e as Error).message };
      }
    },
    // Modellen får en kompakt tekstudgave (hurtigere og billigere); UI'et får de fulde data.
    toModelOutput: ({ output }) => {
      // Tekniske detaljer logges på serveren, men gives aldrig videre til kunden.
      if ("error" in output && output.error)
        return {
          type: "text",
          value:
            "Søgningen virkede ikke lige nu (midlertidig fejl). Prøv søgningen én gang til; virker den stadig ikke, så bed kunden prøve igen om lidt eller bruge shoppens søgefelt. Nævn ingen tekniske detaljer.",
        };
      if (output.products.length === 0) return { type: "text", value: `Ingen resultater for "${output.query}".` };
      const lines = output.products.map((p, i) => {
        const specs = (p.specs || [])
          .map((s) => `${s.label}: ${s.value}`)
          .join("; ")
          .slice(0, 400);
        return (
          `${i + 1}. ${p.name} | varenr ${p.sku} | ${p.price != null ? `${p.price.toFixed(2)} kr` : "pris ukendt"} | ${p.inStock ? "på lager" : "bestillingsvare"}${p.delivery ? ` | levering ${p.delivery}` : ""}` +
          (specs ? `\n   Egenskaber: ${specs}` : "") +
          (p.short ? `\n   Tekst: ${p.short}` : "")
        );
      });
      const used = "usedQuery" in output ? output.usedQuery : undefined;
      const head = used
        ? `Ingen resultater for "${output.query}", så der blev søgt på "${used}" i stedet: ${output.total} resultater.`
        : `${output.total} resultater for "${output.query}".`;
      return { type: "text", value: `${head} Viser kunden disse:\n${lines.join("\n")}` };
    },
  }),
};

export type ChatTools = typeof tools;

/**
 * Fælles indstillinger for chatten. OpenAI's gpt-5-modeller "tænker" før de svarer;
 * de tokens tæller med i maxOutputTokens, så loftet skal være højt nok, og
 * tænkningen holdes lav for at få hurtige svar.
 */
export function chatSettings(messages: ModelMessage[], effortOverride?: string) {
  const { model, provider } = getModel();
  return {
    model,
    instructions: INSTRUCTIONS,
    messages,
    tools,
    stopWhen: stepCountIs(4),
    maxOutputTokens: 2500,
    providerOptions:
      provider === "openai"
        ? {
            openai: {
              reasoningEffort: effortOverride || process.env.AI_REASONING_EFFORT || "low",
              textVerbosity: "low",
            },
          }
        : undefined,
  };
}

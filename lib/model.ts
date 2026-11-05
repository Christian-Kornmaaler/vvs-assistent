import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Vælg AI-udbyder med én miljøvariabel:
 *   AI_PROVIDER=anthropic | openai   (standard: den der har en nøgle, Claude først)
 *   AI_MODEL=<model-id>              (valgfri, overstyrer standardmodellen)
 */
export function getModel(): { model: LanguageModel; provider: string; id: string } {
  const wanted = process.env.AI_PROVIDER?.toLowerCase();
  const provider =
    wanted === "openai" || wanted === "anthropic"
      ? wanted
      : process.env.ANTHROPIC_API_KEY
        ? "anthropic"
        : "openai";

  if (provider === "anthropic") {
    const id = process.env.AI_MODEL || "claude-haiku-5-5";
    return { model: anthropic(id), provider, id };
  }
  const id = process.env.AI_MODEL || "gpt-5-mini";
  return { model: openai(id), provider, id };
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { chatSettings, tools } from "@/lib/chat";
import { aiConfigured } from "@/lib/model";
import { rateLimited } from "@/lib/rate-limit";

export type { ChatTools } from "@/lib/chat";

export const maxDuration = 30;

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

  const result = streamText({
    ...chatSettings(await convertToModelMessages(messages, { tools })),
    onError: ({ error }) => console.error("chat fejl:", error),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("chat stream fejl:", error);
      return "Assistenten kunne ikke svare lige nu. Prøv igen om et øjeblik.";
    },
  });
}

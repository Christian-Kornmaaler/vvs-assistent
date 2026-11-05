"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type InferUITools, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatTools } from "@/app/api/chat/route";
import type { SearchResult } from "@/lib/types";
import s from "./assistant.module.css";
import ProductList from "./product-list";

type Msg = UIMessage<unknown, never, InferUITools<ChatTools>>;

const SUGGESTIONS = [
  "Jeg skal bruge en kuglehane til mit vandrør",
  "Knæ til 22 mm kobberrør",
  "Ny termostat til brusebadet",
  "Hvad tætner jeg gevind med?",
];


function close() {
  window.parent?.postMessage({ type: "vvs-assistent:close" }, "*");
}

export default function Assistant() {
  const { messages, sendMessage, status, error, stop } = useChat<Msg>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // Seneste søgning (afsluttet eller i gang) styrer produktkolonnen.
  // AI'en kan prøve flere søgninger i ét svar; vis den sidste, der faktisk fandt noget.
  // Fandt ingen af svarets søgninger noget, vises den tomme (så kunden ikke ser forældede varer).
  const { latest, latestKey, pendingQuery } = useMemo(() => {
    let latest: SearchResult | null = null;
    let latestKey = "";
    let pendingQuery: string | null = null;
    for (const m of messages) {
      let turnBest: { r: SearchResult; key: string } | null = null;
      let turnLast: { r: SearchResult; key: string } | null = null;
      for (const p of m.parts) {
        if (p.type !== "tool-search_products") continue;
        if (p.state === "output-available") {
          const r = p.output as SearchResult;
          turnLast = { r, key: p.toolCallId };
          if (r.products?.length) turnBest = { r, key: p.toolCallId };
          const pick = turnBest || turnLast;
          latest = pick.r;
          latestKey = pick.key;
          pendingQuery = null;
        } else if (p.state === "input-available" || p.state === "input-streaming") {
          pendingQuery = (p.input as { query?: string } | undefined)?.query ?? "";
        }
      }
    }
    return { latest, latestKey, pendingQuery };
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  const lastIsUser = messages.at(-1)?.role === "user";
  const showProducts = Boolean(latest || pendingQuery !== null);

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.title}>
          <span className={s.mark} aria-hidden>
            <SearchIcon />
          </span>
          <div>
            <strong>Produktassistent</strong>
            <span className={s.subtitle}>Find det rigtige produkt</span>
          </div>
        </div>
        <button className={s.close} onClick={close} aria-label="Luk assistenten">
          <CloseIcon />
        </button>
      </header>

      <div className={`${s.body} ${showProducts ? s.hasProducts : ""}`}>
        <section className={s.chat}>
          <div className={s.messages} ref={scrollRef}>
            {messages.length === 0 && (
              <div className={s.welcome}>
                <p className={s.hello}>Hej! Fortæl mig, hvad du skal lave eller hvad du mangler, så finder vi det rigtige produkt sammen.</p>
                <div className={s.chips}>
                  {SUGGESTIONS.map((q) => (
                    <button key={q} className={s.chip} onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? s.userRow : s.botRow}>
                {m.parts.map((p, i) => {
                  if (p.type === "text" && p.text.trim()) {
                    return (
                      <div key={i} className={m.role === "user" ? s.userBubble : s.botBubble}>
                        {p.text}
                      </div>
                    );
                  }
                  if (p.type === "tool-search_products") {
                    const q = (p.input as { query?: string } | undefined)?.query;
                    const done = p.state === "output-available";
                    return (
                      <div key={i} className={s.searchNote}>
                        <SearchIcon />
                        <span>
                          {done ? "Søgte efter" : "Søger efter"} <b>{q || "…"}</b>
                          {done && p.output && !("error" in (p.output as object))
                            ? ` · ${(p.output as SearchResult).total} fundet`
                            : ""}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}

            {busy && lastIsUser && (
              <div className={s.botRow}>
                <div className={s.typing} aria-label="Skriver">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}

            {error && (
              <div className={s.error}>
                Noget gik galt. Prøv igen om et øjeblik.
              </div>
            )}
          </div>

          <form
            className={s.composer}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              className={s.input}
              value={input}
              rows={1}
              maxLength={1000}
              placeholder="Skriv hvad du leder efter…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            {busy ? (
              <button type="button" className={s.send} onClick={() => stop()} aria-label="Stop">
                <StopIcon />
              </button>
            ) : (
              <button type="submit" className={s.send} disabled={!input.trim()} aria-label="Send">
                <SendIcon />
              </button>
            )}
          </form>
        </section>

        {showProducts && (
          <aside className={s.products} aria-label="Fundne produkter">
            {latest ? (
              <ProductList key={latestKey} result={latest} dim={pendingQuery !== null} />
            ) : (
              <>
                <div className={s.productsHead}>
                  <span>
                    Søger efter <b>{pendingQuery || "…"}</b>
                  </span>
                </div>
                <div className={s.productList}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={s.skeleton} />
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* Ikoner */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" />
    </svg>
  );
}

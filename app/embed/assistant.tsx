"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type InferUITools, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatTools } from "@/app/api/chat/route";
import type { Product, SearchResult } from "@/lib/types";
import s from "./assistant.module.css";

type Msg = UIMessage<unknown, never, InferUITools<ChatTools>>;

const SUGGESTIONS = [
  "Jeg skal bruge en kuglehane til mit vandrør",
  "Knæ til 22 mm kobberrør",
  "Ny termostat til brusebadet",
  "Hvad tætner jeg gevind med?",
];

const kr = (n: number) =>
  n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr.";

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
  const { latest, pendingQuery } = useMemo(() => {
    let latest: SearchResult | null = null;
    let pendingQuery: string | null = null;
    for (const m of messages) {
      for (const p of m.parts) {
        if (p.type !== "tool-search_products") continue;
        if (p.state === "output-available") {
          latest = p.output as SearchResult;
          pendingQuery = null;
        } else if (p.state === "input-available" || p.state === "input-streaming") {
          pendingQuery = (p.input as { query?: string } | undefined)?.query ?? "";
        }
      }
    }
    return { latest, pendingQuery };
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
                          {done && p.output ? ` · ${(p.output as SearchResult).total} fundet` : ""}
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
            <div className={s.productsHead}>
              {pendingQuery !== null ? (
                <span>
                  Søger efter <b>{pendingQuery || "…"}</b>
                </span>
              ) : latest ? (
                <span>
                  <b>{latest.total}</b> resultater · lagervarer først
                </span>
              ) : null}
              {latest?.source === "demo" && <span className={s.demo}>Demo-data</span>}
            </div>
            <div className={s.productList}>
              {pendingQuery !== null && !latest
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={s.skeleton} />)
                : latest?.products.map((p) => <ProductCard key={p.sku} p={p} dim={pendingQuery !== null} />)}
              {pendingQuery === null && latest && latest.products.length === 0 && (
                <p className={s.empty}>Ingen produkter matchede. Prøv at beskrive det på en anden måde.</p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ProductCard({ p, dim }: { p: Product; dim: boolean }) {
  return (
    <a className={`${s.card} ${dim ? s.dim : ""}`} href={p.url} target="_top" rel="noopener">
      <div className={s.thumb}>
        {p.image ? <img src={p.image} alt="" loading="lazy" /> : <BoxIcon />}
      </div>
      <div className={s.cardBody}>
        <div className={s.name}>{p.name}</div>
        {p.specs?.some((x) => x.card) ? (
          <div className={s.specs}>
            {p.specs
              .filter((x) => x.card)
              .slice(0, 3)
              .map((x) => (
                <span key={x.label} title={x.label}>
                  {x.value}
                </span>
              ))}
          </div>
        ) : (
          p.short && <div className={s.short}>{p.short}</div>
        )}
        <div className={s.meta}>
          {p.price != null && <span className={s.price}>{kr(p.price)}</span>}
          <span className={p.inStock ? s.inStock : s.order}>{p.inStock ? "På lager" : "Bestillingsvare"}</span>
        </div>
      </div>
    </a>
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
function BoxIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </svg>
  );
}

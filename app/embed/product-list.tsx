"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product, SearchResult } from "@/lib/types";
import s from "./assistant.module.css";
import { track } from "./track-client";

// Samme prisformat som shoppen: "30,00 DKK"
const dkk = (n: number) =>
  n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DKK";

/**
 * Uendelig produktliste: viser første side fra AI'ens søgning og henter
 * næste side (40 varer) automatisk, når kunden nærmer sig bunden.
 * Komponenten genmonteres (key) ved hver ny søgning, så tilstanden nulstilles.
 */
export default function ProductList({ result, dim }: { result: SearchResult; dim: boolean }) {
  const [products, setProducts] = useState<Product[]>(result.products);
  const [page, setPage] = useState(result.page ?? 1);
  const [hasMore, setHasMore] = useState(Boolean(result.hasMore));
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const query = result.usedQuery || result.query;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&page=${page + 1}`);
      const data = (await res.json()) as { ok: boolean; products?: Product[]; hasMore?: boolean; page?: number };
      if (!data.ok) throw new Error("fejl");
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.sku));
        return [...prev, ...(data.products || []).filter((p) => !seen.has(p.sku))];
      });
      setPage(data.page ?? page + 1);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, query]);

  // Hent næste side, når "sentinel" i bunden (eller højre ende på mobil) kommer i syne.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || failed) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      root: listRef.current,
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore, failed]);

  const inStock = products.filter((p) => p.inStock);
  const ordered = products.filter((p) => !p.inStock);

  return (
    <>
      <div className={s.productsHead}>
        <span>
          <b>{result.total.toLocaleString("da-DK")}</b> resultater · lagervarer først, billigst øverst
        </span>
        {result.source === "demo" && <span className={s.demo}>Demo-data</span>}
      </div>
      <div className={s.productList} ref={listRef}>
        {/* Alle lagervarer øverst – også når flere sider hentes ved scroll – derefter bestillingsvarer.
            Rækkefølgen inden for hver gruppe er den, serveren har sorteret (relevans, pris). */}
        {inStock.map((p, i) => (
          <ProductCard key={p.sku} p={p} dim={dim} position={i + 1} query={query} />
        ))}
        {ordered.length > 0 && inStock.length > 0 && <div className={s.groupLabel}>Bestillingsvarer</div>}
        {ordered.map((p, i) => (
          <ProductCard key={p.sku} p={p} dim={dim} position={inStock.length + i + 1} query={query} />
        ))}
        {products.length === 0 && (
          <p className={s.empty}>Ingen produkter matchede. Prøv at beskrive det på en anden måde.</p>
        )}
        {hasMore && (
          <div ref={sentinel} className={s.more}>
            {failed ? (
              <button className={s.retry} onClick={() => loadMore()}>
                Kunne ikke hente flere. Prøv igen
              </button>
            ) : (
              <>
                <div className={s.skeleton} />
                <div className={s.skeleton} />
              </>
            )}
          </div>
        )}
        {!hasMore && products.length > 8 && <p className={s.end}>Viser alle {products.length} varer</p>}
      </div>
    </>
  );
}

function ProductCard({ p, dim, position, query }: { p: Product; dim: boolean; position: number; query: string }) {
  const onClick = () =>
    track({ type: "click", sku: p.sku, productName: p.name, position, query, price: p.price, inStock: p.inStock });
  return (
    <a className={`${s.card} ${dim ? s.dim : ""}`} href={p.url} target="_top" rel="noopener" onClick={onClick} onAuxClick={onClick}>
      <div className={s.cardTop}>
        <div className={s.thumb}>{p.image ? <img src={p.image} alt="" loading="lazy" /> : <BoxIcon />}</div>
        <div className={s.cardBody}>
          <div className={s.name}>{p.name}</div>
          <div className={s.sku}>Varenr. {p.sku}</div>
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
            p.short &&
            !p.short.toLowerCase().startsWith(p.name.toLowerCase().slice(0, 25)) && (
              <div className={s.short}>{p.short}</div>
            )
          )}
        </div>
      </div>
      <div className={s.priceBox}>
        <div>
          {p.price != null ? <span className={s.price}>{dkk(p.price)}</span> : <span className={s.price}>Se pris</span>}
          {p.price != null && <span className={s.vat}>Inkl. moms/pr. stk.</span>}
        </div>
        <div className={s.stock}>
          <span className={s.stockLine}>
            <i className={p.inStock ? s.dotOk : s.dotOrder} aria-hidden />
            {p.inStock ? (p.qty && p.qty > 0 ? `${Math.floor(p.qty)} på lager` : "På lager") : "Bestillingsvare"}
          </span>
          {p.delivery && <span className={s.delivery}>Levering {p.delivery}</span>}
        </div>
      </div>
    </a>
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

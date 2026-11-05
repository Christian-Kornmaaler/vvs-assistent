import Script from "next/script";
import s from "./page.module.css";

const SNIPPET_TEST = `<script src="https://assistent.vvsfittings.dk/widget.js" defer></script>`;
const SNIPPET_LIVE = `<script src="https://assistent.vvsfittings.dk/widget.js" data-public="true" defer></script>`;

export default function TestPage() {
  return (
    <main className={s.main}>
      <div className={s.box}>
        <p className={s.kicker}>Testside</p>
        <h1>Produktassistent til vvsfittings.dk</h1>
        <p>
          Klik på knappen <b>Find produkt</b> nederst til højre for at afprøve assistenten, som den vil se ud på
          shoppen.
        </p>

        <h2>1. Indsæt på shoppen (testtilstand)</h2>
        <p>
          I Magento: <i>Content → Design → Configuration → (store view) → HTML Head → Scripts and Style Sheets</i>.
          Tøm derefter cachen under <i>System → Cache Management</i>.
        </p>
        <pre className={s.code}>{SNIPPET_TEST}</pre>
        <p className={s.note}>
          Knappen vises kun for jer: åbn en side på shoppen med <code>?assistent=1</code> i adressen (fx
          vvsfittings.dk/?assistent=1). Det huskes i browseren; <code>?assistent=0</code> slår den fra igen.
        </p>

        <h2>2. Gå live for alle kunder</h2>
        <p>Udskift linjen med denne (tilføjet data-public) og tøm cachen:</p>
        <pre className={s.code}>{SNIPPET_LIVE}</pre>
        <p className={s.note}>
          Assistenten kan også åbnes fra egne knapper med <code>window.vvsAssistent.open()</code>.
        </p>
      </div>
      <Script src="/widget.js" data-public="true" strategy="afterInteractive" />
    </main>
  );
}

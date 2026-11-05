import Script from "next/script";
import s from "./page.module.css";

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
        <h2>Indsæt på shoppen</h2>
        <p>
          I Magento: <i>Content → Design → Configuration → (store view) → HTML Head → Scripts and Style Sheets</i>
        </p>
        <pre className={s.code}>{`<script src="https://<dette-domæne>/widget.js" defer></script>`}</pre>
        <p className={s.note}>
          Assistenten kan også åbnes fra egne knapper med <code>window.vvsAssistent.open()</code>.
        </p>
      </div>
      <Script src="/widget.js" strategy="afterInteractive" />
    </main>
  );
}

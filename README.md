# vvs-assistent

Produktassistent til vvsfittings.dk: et lille ikon på shoppen, der åbner et udglidningspanel med en AI-dialog.
Mens kunden skriver, søger assistenten i kataloget og viser produkter med billede, kort tekst, pris og lagerstatus.
Lagervarer (MSI salable qty) prioriteres i rangeringen.

## Indsæt på shoppen

Magento: *Content → Design → Configuration → (store view) → HTML Head → Scripts and Style Sheets*

```html
<script src="https://<assistent-domæne>/widget.js" defer></script>
```

Valgfrit: `data-color="#0b5cad"` og `data-label="Find produkt"`. Kan åbnes fra egne knapper med `window.vvsAssistent.open()`.

## Opbygning

- `public/widget.js` – knap + panel (Shadow DOM, så shoppens CSS ikke påvirker det), indlæser `/embed` i en iframe
- `app/embed` – chat og produktkort
- `app/api/chat` – AI-dialog (Vercel AI SDK) med værktøjet `search_products`
- `lib/magento.ts` – søgning via Magentos `/V1/search` (OpenSearch), produktdata og MSI salable qty
- `lib/demo-catalog.ts` – demo-data, bruges kun når Magento-nøglen mangler
- `app/api/health` – viser hvilken AI-udbyder og datakilde der er aktiv

## Miljøvariabler

Se `.env.example`. Uden `MAGENTO_URL`/`MAGENTO_TOKEN` kører assistenten på demo-data.
Brug en Magento-integration med **kun læseadgang** til produkter og lager – aldrig kundeservice-appens nøgler.

Skift AI-udbyder med `AI_PROVIDER=anthropic|openai` og evt. `AI_MODEL`.

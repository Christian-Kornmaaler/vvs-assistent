import type { Product } from "./types";

/**
 * Demo-data, så assistenten kan afprøves før Magento-nøglen er sat op.
 * Bruges KUN når MAGENTO_URL/MAGENTO_TOKEN mangler. Varerne er opdigtede eksempler.
 */
type Demo = Omit<Product, "id" | "url" | "image"> & { kw: string };

const items: Demo[] = [
  { sku: "DEMO-1001", name: 'Messing knæ 90° 1/2" indv. x indv.', price: 24.95, short: "Gevindfitting i messing til vandinstallation. Indvendigt gevind i begge ender.", inStock: true, qty: 48, kw: "vinkel bøjning fitting gevind 15" },
  { sku: "DEMO-1002", name: 'Messing knæ 90° 3/4" indv. x udv.', price: 32.5, short: "Gevindfitting i messing, indvendigt x udvendigt gevind.", inStock: true, qty: 22, kw: "vinkel bøjning fitting gevind 20" },
  { sku: "DEMO-1003", name: 'Messing knæ 90° 1" indv. x indv.', price: 54.0, short: "Kraftig messingfitting med indvendigt gevind i begge ender.", inStock: false, qty: 0, kw: "vinkel bøjning fitting gevind 25" },
  { sku: "DEMO-1010", name: "Pressfitting knæ 90° 15 mm kobber", price: 19.95, short: "Pressfitting til kobberrør med V-profil. EPDM O-ring.", inStock: true, qty: 140, kw: "press kobber vinkel bøjning v-profil" },
  { sku: "DEMO-1011", name: "Pressfitting knæ 90° 22 mm kobber", price: 27.95, short: "Pressfitting til kobberrør med V-profil. EPDM O-ring.", inStock: true, qty: 86, kw: "press kobber vinkel bøjning v-profil" },
  { sku: "DEMO-1012", name: "Pressfitting knæ 90° 28 mm kobber", price: 41.5, short: "Pressfitting til kobberrør med V-profil.", inStock: false, qty: 0, kw: "press kobber vinkel bøjning v-profil" },
  { sku: "DEMO-1020", name: "Kompressionsfitting lige 15 mm", price: 34.95, short: "Lige samling med klemring til kobber- og stålrør. Ingen værktøj nødvendigt.", inStock: true, qty: 31, kw: "samling klemring kobling kompression lige muffe" },
  { sku: "DEMO-1021", name: "Kompressionsfitting lige 22 mm", price: 49.95, short: "Lige samling med klemring til kobber- og stålrør.", inStock: true, qty: 12, kw: "samling klemring kobling kompression lige muffe" },
  { sku: "DEMO-1022", name: 'Kompressionsfitting 15 mm x 1/2" udv.', price: 29.95, short: "Overgang fra klemring til udvendigt gevind.", inStock: true, qty: 54, kw: "overgang klemring gevind kompression" },
  { sku: "DEMO-1030", name: "Kuglehane 1/2\" med grebshåndtag", price: 79.0, short: "Fuldt gennemløb, forniklet messing. Til vand og varme op til 25 bar.", inStock: true, qty: 17, kw: "ventil afspærring hane stophane kugleventil" },
  { sku: "DEMO-1031", name: "Kuglehane 3/4\" med sommerfuglegreb", price: 98.0, short: "Fuldt gennemløb, forniklet messing. Til vand og varme.", inStock: false, qty: 0, kw: "ventil afspærring hane stophane kugleventil" },
  { sku: "DEMO-1032", name: "Kuglehane 15 mm klemring", price: 119.0, short: "Afspærringsventil med klemringsforbindelse i begge ender.", inStock: true, qty: 9, kw: "ventil afspærring stophane kompression" },
  { sku: "DEMO-1040", name: "Termostatisk brusearmatur 160 mm cc", price: 1495.0, short: "Termostatarmatur med skoldningssikring ved 38 °C og sparestop.", inStock: true, qty: 6, kw: "bruser armatur termostat bad brusebad" },
  { sku: "DEMO-1041", name: "Brusesæt med 25 cm hovedbruser", price: 2295.0, short: "Komplet brusesystem med termostat, hovedbruser og håndbruser.", inStock: false, qty: 0, kw: "bruser brusesystem bad regnbruser" },
  { sku: "DEMO-1042", name: "Håndbruser 3 funktioner krom", price: 249.0, short: "Håndbruser med tre strålefunktioner og kalkfri dyser.", inStock: true, qty: 24, kw: "bruser bad brusehoved" },
  { sku: "DEMO-1050", name: "Køkkenarmatur med udtræk krom", price: 1295.0, short: "Etgrebsarmatur med udtrækkelig bruser og keramisk ventil.", inStock: true, qty: 5, kw: "køkken blandingsbatteri vandhane armatur" },
  { sku: "DEMO-1051", name: "Håndvaskarmatur med bundventil", price: 795.0, short: "Etgrebsarmatur til håndvask inkl. løftebundventil.", inStock: true, qty: 11, kw: "bad håndvask vandhane armatur blandingsbatteri" },
  { sku: "DEMO-1060", name: "PEX-rør 16 mm i kappe, 50 m", price: 649.0, short: "PEX-rør i beskyttelsesrør til rør-i-rør installation.", inStock: true, qty: 8, kw: "pex rør i rør vandrør kappe" },
  { sku: "DEMO-1061", name: "PEX-rør 20 mm i kappe, 50 m", price: 829.0, short: "PEX-rør i beskyttelsesrør til rør-i-rør installation.", inStock: false, qty: 0, kw: "pex rør i rør vandrør kappe" },
  { sku: "DEMO-1062", name: 'PEX-kobling 16 mm x 1/2" udv.', price: 39.95, short: "Klemringsovergang fra PEX til udvendigt gevind.", inStock: true, qty: 64, kw: "pex overgang samling gevind kobling" },
  { sku: "DEMO-1070", name: "Gulvafløb Ø110 med vandlås", price: 389.0, short: "Gulvafløb til vådrum med rist og aftagelig vandlås.", inStock: true, qty: 7, kw: "afløb bad vådrum gulv rist" },
  { sku: "DEMO-1071", name: "Vandlås til håndvask 1 1/4\"", price: 129.0, short: "Rørvandlås i hvid plast med rengøringsåbning.", inStock: true, qty: 19, kw: "afløb håndvask vandlås" },
  { sku: "DEMO-1080", name: "Teflontape 12 mm x 12 m", price: 9.95, short: "PTFE-gevindtape til tætning af gevindsamlinger.", inStock: true, qty: 300, kw: "tætning gevind ptfe tape pakning" },
  { sku: "DEMO-1081", name: "Gevindtætning Loctite 55, 50 m", price: 89.0, short: "Tætningssnor til metal- og plastgevind. Kan efterjusteres.", inStock: true, qty: 40, kw: "tætning gevind snor pakning" },
  { sku: "DEMO-1082", name: "Hamp med pasta, sæt", price: 69.0, short: "Klassisk gevindtætning med hamp og fittingspasta.", inStock: false, qty: 0, kw: "tætning gevind hamp pakning" },
  { sku: "DEMO-1090", name: "Rørtang 1 1/2\" justerbar", price: 219.0, short: "Robust rørtang med hurtigjustering og hærdede kæber.", inStock: true, qty: 13, kw: "værktøj tang rørtang vandpumpetang" },
  { sku: "DEMO-1091", name: "Rørskærer 3-35 mm til kobber", price: 179.0, short: "Rørskærer med ekstra skærehjul til kobber- og alurør.", inStock: true, qty: 9, kw: "værktøj skærer rørskærer kobber" },
  { sku: "DEMO-1092", name: "Pressværktøj batteri V-profil 15-28 mm", price: 8995.0, short: "Batteridrevet pressmaskine med kæber 15, 18, 22 og 28 mm.", inStock: false, qty: 0, kw: "værktøj press presstang maskine" },
  { sku: "DEMO-1100", name: "Pandelampe genopladelig 1000 lumen", price: 549.0, short: "Genopladelig pandelampe med fokus-funktion og rødt lys.", inStock: true, qty: 15, kw: "lampe lygte pandelampe lys" },
  { sku: "DEMO-1110", name: "Radiatorventil termostatisk 1/2\" vinkel", price: 159.0, short: "Termostatisk radiatorventil i vinkeludførelse.", inStock: true, qty: 21, kw: "radiator ventil varme termostat" },
  { sku: "DEMO-1111", name: "Termostatføler til radiatorventil", price: 189.0, short: "Termostathoved med frostsikring og indstilling 1-5.", inStock: true, qty: 26, kw: "radiator termostat føler varme" },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[”"″]/g, '"')
    .replace(/(\d)\s*mm/g, "$1mm");

export function demoSearch(query: string): { total: number; products: Product[] } {
  const terms = norm(query)
    .split(/[\s,]+/)
    .filter((t) => t.length > 1);
  const scored = items
    .map((it, i) => {
      const hay = norm(`${it.name} ${it.short} ${it.kw}`);
      const nameHay = norm(it.name);
      let score = 0;
      for (const t of terms) {
        if (nameHay.includes(t)) score += 3;
        else if (hay.includes(t)) score += 1;
        else if (t.length > 4 && hay.includes(t.slice(0, -2))) score += 0.5; // grov bøjningsform
      }
      return { it, i, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const products: Product[] = scored
    .map((x, rank) => ({ x, rank: rank + (x.it.inStock ? 0 : 8) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ x }) => ({
      id: 9000 + x.i,
      sku: x.it.sku,
      name: x.it.name,
      price: x.it.price,
      image: null,
      url: `https://www.vvsfittings.dk/catalogsearch/result/?q=${encodeURIComponent(x.it.name)}`,
      short: x.it.short,
      inStock: x.it.inStock,
      qty: x.it.qty,
    }));
  return { total: products.length, products };
}

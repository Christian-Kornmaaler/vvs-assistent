/**
 * Tekniske attributter fra vvsfittings.dk's Magento, som assistenten bruger til at
 * vælge og forklare produkter. Koderne er hentet fra shoppens egen attributliste.
 *
 * Rækkefølgen er prioritet: de første vises på produktkortet, resten gives kun til AI'en.
 */
export const SPEC_ATTRIBUTES: { code: string; label: string; card?: boolean }[] = [
  { code: "dimension", label: "Dimension", card: true },
  { code: "ef023193", label: "Tilslutning", card: true },
  { code: "ef001758", label: "Gevindtype", card: true },
  { code: "fitting_type", label: "Fitting type" },
  { code: "red_dimension", label: "Reduceret dimension" },
  { code: "dimension_dn", label: "DN" },
  { code: "ef020052", label: "Tilslutning 2" },
  { code: "ef020053", label: "Tilslutning 3" },
  { code: "ef000321", label: "Tilslutning 1 (mål)" },
  { code: "ef000322", label: "Tilslutning 2 (mål)" },
  { code: "ef000124", label: "Tilslutningstype" },
  { code: "ef000051", label: "Form" },
  { code: "angle", label: "Vinkel" },
  { code: "ef005431", label: "Vinkel på bøjning" },
  { code: "material", label: "Materiale" },
  { code: "ef023825", label: "Primært materiale" },
  { code: "ef016081", label: "Overflade/farve" },
  { code: "diameter", label: "Diameter" },
  { code: "ahl_innerdiameter_mm", label: "Indv. diameter" },
  { code: "ef006272", label: "Udv. rørdiameter" },
  { code: "ef020007", label: "Trykklasse" },
  { code: "ef020449", label: "Max. arbejdstryk" },
  { code: "ahl_temperaturemax_c", label: "Temperatur max" },
  { code: "ahl_drinkingwaterapproval", label: "Drikkevandsgodkendelse" },
  { code: "ef000030", label: "Funktion" },
  { code: "ef000010", label: "Type" },
  { code: "product_group", label: "Produktgruppe" },
  { code: "manufacturer", label: "Brand" },
  { code: "product_series", label: "Serie" },
  { code: "specification_length", label: "Længde" },
  { code: "key_width", label: "Nøglevidde" },
  { code: "ahl_protectionclassip", label: "IP-klasse" },
];

/** Leveringstid for varer der IKKE er på lager (option-attribut). Lagervarer: STOCK_DELIVERY. */
export const DELIVERY_ATTRIBUTE = "expected_delivery_time";
export const STOCK_DELIVERY = "1-2 hverdage";

/** Tekst-attributter (ingen options) der også er nyttige for AI'en. */
export const TEXT_ATTRIBUTES: { code: string; label: string }[] = [
  { code: "ahl_usedfor", label: "Anvendes til" },
  { code: "ahl_fitswith", label: "Passer til" },
  { code: "ahl_mounting", label: "Montering" },
  { code: "product_text_2", label: "Typenr." },
  { code: "package_quantity", label: "Pakke antal" },
];

/** Magento bruger "-8888 mm" o.l. som tom værdi; de skal ikke vises. */
export function isJunkValue(v: string): boolean {
  const t = v.trim().toLowerCase();
  return !t || t.startsWith("-8888") || t === "andet" || t === "-" || t === "none";
}

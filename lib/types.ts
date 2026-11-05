export type Product = {
  id: number;
  sku: string;
  name: string;
  /** Pris inkl. moms i DKK, som den vises i shoppen */
  price: number | null;
  image: string | null;
  url: string;
  /** Kort tekst til kortet (renset for HTML) */
  short: string;
  /** Kan sælges fra lager nu (salable qty > 0) */
  inStock: boolean;
  /** Samlet lager på tværs af kilder, hvis kendt */
  qty: number | null;
  /** Tekniske egenskaber (dimension, gevind, materiale …) */
  specs?: Spec[];
};

export type Spec = { label: string; value: string; card: boolean };

export type SearchResult = {
  query: string;
  total: number;
  products: Product[];
  ms: number;
  source: "magento" | "demo";
  /** Tid pr. trin i Magento (ms), kun til fejlsøgning */
  timings?: { search: number; products: number; salable: number };
  debug?: Record<string, unknown>;
};

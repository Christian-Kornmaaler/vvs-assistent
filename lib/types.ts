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
  /** Salable qty hvis kendt */
  qty: number | null;
};

export type SearchResult = {
  query: string;
  total: number;
  products: Product[];
  ms: number;
  source: "magento" | "demo";
};

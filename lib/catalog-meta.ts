// Shared, client-safe helpers (no DB access here).

export const COLORS: Record<string, string> = {
  Black: "#1f2328",
  Navy: "#1e3a5f",
  Sage: "#8fa98a",
  Rose: "#d98f9b",
  Sand: "#d9c3a5",
  "Electric Blue": "#2f6bff",
  Charcoal: "#4a4f57",
  Lilac: "#b9a3d6",
  Olive: "#6b7140",
  White: "#f4f4f2",
  Red: "#d64545",
};

export const colorSlug = (c: string) => c.toLowerCase().replace(/\s+/g, "-");

export function colorFromSlug(slug: string): string | undefined {
  return Object.keys(COLORS).find((c) => colorSlug(c) === slug);
}

export const imageUrl = (imageKey: string, color: string) => `/img/${imageKey}/${colorSlug(color)}`;

export const splitList = (csv: string) =>
  csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export const FREE_SHIPPING_THRESHOLD_CENTS = 7500;
export const SHIPPING_FEE_CENTS = 499;
export const MAX_QTY_PER_LINE = 10;

export const COUNTRIES: Record<string, string> = {
  DE: "Germany",
  AT: "Austria",
  NL: "Netherlands",
  BE: "Belgium",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  PL: "Poland",
};

export const SORTS: Record<string, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
};

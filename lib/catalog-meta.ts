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

export type DiscountRule = { type: "PERCENT" | "FIXED"; valueCents: number } | null;

/** Discount (in cents) a coupon rule gives on a given subtotal. Mirrors evaluateCoupon(). */
export function discountForSubtotal(rule: DiscountRule, subtotalCents: number): number {
  if (!rule) return 0;
  return rule.type === "PERCENT"
    ? Math.round((subtotalCents * rule.valueCents) / 10000)
    : Math.min(rule.valueCents, subtotalCents);
}

/**
 * Smallest amount (cents) the shopper must add to their subtotal so that
 * (subtotal - discount) reaches the free-shipping threshold. The coupon keeps
 * applying to the added items, so a percent coupon needs more than the naive gap.
 * Returns 0 if shipping is already free, null if the threshold can never be reached
 * (for example a 100% coupon).
 */
export function amountToFreeShippingCents(subtotalCents: number, rule: DiscountRule): number | null {
  const net = (extra: number) => subtotalCents + extra - discountForSubtotal(rule, subtotalCents + extra);
  if (net(0) >= FREE_SHIPPING_THRESHOLD_CENTS) return 0;
  // net() never decreases as the subtotal grows, so binary-search the smallest extra.
  let lo = 0;
  let hi = FREE_SHIPPING_THRESHOLD_CENTS * 100;
  if (net(hi) < FREE_SHIPPING_THRESHOLD_CENTS) return null;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (net(mid) >= FREE_SHIPPING_THRESHOLD_CENTS) hi = mid;
    else lo = mid;
  }
  return hi;
}

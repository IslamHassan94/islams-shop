import type { Quote } from "@/lib/checkout";
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEUR } from "@/lib/catalog-meta";

export default function OrderSummary({ quote, loading }: { quote: Quote | null; loading?: boolean }) {
  if (!quote) return null;
  const toFree = FREE_SHIPPING_THRESHOLD_CENTS - (quote.subtotalCents - quote.discountCents);
  return (
    <dl className={`space-y-3 text-sm ${loading ? "opacity-60" : ""}`} data-testid="order-summary">
      <div className="flex justify-between"><dt>Subtotal</dt><dd data-testid="summary-subtotal">{formatEUR(quote.subtotalCents)}</dd></div>
      {quote.discountCents > 0 && (
        <div className="flex justify-between text-green-700"><dt>Discount {quote.coupon?.code ? `(${quote.coupon.code})` : ""}</dt><dd data-testid="summary-discount">−{formatEUR(quote.discountCents)}</dd></div>
      )}
      <div className="flex justify-between"><dt>Shipping</dt><dd data-testid="summary-shipping">{quote.shippingCents === 0 ? "Free" : formatEUR(quote.shippingCents)}</dd></div>
      {quote.shippingCents > 0 && toFree > 0 && (
        <p className="rounded-lg bg-lime/30 px-3 py-2 text-xs" data-testid="free-shipping-hint">Add {formatEUR(toFree)} more for free shipping</p>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base font-black"><dt>Total</dt><dd data-testid="summary-total">{formatEUR(quote.totalCents)}</dd></div>
    </dl>
  );
}

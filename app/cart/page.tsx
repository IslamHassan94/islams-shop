"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart";
import OrderSummary from "@/components/OrderSummary";
import { MAX_QTY_PER_LINE, formatEUR, imageUrl } from "@/lib/catalog-meta";
import { useQuote } from "@/lib/useQuote";

export default function CartPage() {
  const { lines, ready, setQuantity, remove, couponCode, setCouponCode } = useCart();
  const { quote, loading, error } = useQuote(lines, couponCode, ready);
  const [couponInput, setCouponInput] = useState("");

  useEffect(() => {
    if (couponCode) setCouponInput(couponCode);
  }, [couponCode]);

  useEffect(() => {
    document.title = "Cart · Islam's Shop";
  }, []);

  if (!ready) return <div className="container-x py-16 text-muted">Loading cart…</div>;

  if (lines.length === 0)
    return (
      <div className="container-x py-24 text-center" data-testid="empty-cart">
        <h1 className="text-4xl font-black tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-muted">Time to gear up.</p>
        <Link href="/shop" className="btn-primary mt-8" data-testid="continue-shopping">Continue shopping</Link>
      </div>
    );

  const lineError = (productId: number, size: string, color: string) =>
    quote?.lines.find((l) => l.productId === productId && l.size === size && l.color === color)?.error;

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-black tracking-tight">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-line" data-testid="cart-lines">
          {lines.map((l) => {
            const err = lineError(l.productId, l.size, l.color);
            const serverUnit = quote?.lines.find((q) => q.productId === l.productId)?.unitCents ?? l.unitCents;
            return (
              <li key={`${l.productId}-${l.size}-${l.color}`} className="flex gap-4 py-5" data-testid="cart-line" data-product-id={l.productId}>
                <Link href={`/product/${l.slug}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(l.imageKey, l.color)} alt={l.name} className="h-32 w-26 rounded-xl object-cover" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link href={`/product/${l.slug}`} className="font-semibold hover:underline" data-testid="cart-line-name">{l.name}</Link>
                      <p className="mt-1 text-sm text-muted" data-testid="cart-line-variant">{l.color} · {l.size}</p>
                    </div>
                    <p className="font-bold" data-testid="cart-line-total">{formatEUR(serverUnit * l.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <label className="sr-only" htmlFor={`qty-${l.productId}-${l.size}-${l.color}`}>Quantity</label>
                    <select
                      id={`qty-${l.productId}-${l.size}-${l.color}`}
                      value={l.quantity}
                      onChange={(e) => setQuantity(l.productId, l.size, l.color, Number(e.target.value))}
                      className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
                      data-testid="cart-line-qty"
                    >
                      {Array.from({ length: MAX_QTY_PER_LINE }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
                    </select>
                    <button type="button" onClick={() => remove(l.productId, l.size, l.color)} className="text-sm text-muted underline hover:text-ink" data-testid="cart-line-remove">
                      Remove
                    </button>
                  </div>
                  {err && <p className="field-error text-sm" data-testid="cart-line-error">{err}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-3xl border border-line bg-white p-6">
          <h2 className="text-lg font-black">Order summary</h2>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCouponCode(couponInput.trim() || null);
            }}
          >
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="input py-2.5" data-testid="coupon-input" aria-label="Coupon code" />
            <button className="btn-ghost px-4 py-2.5" data-testid="apply-coupon">Apply</button>
          </form>
          {quote?.coupon && (
            <div className={`mt-2 flex items-center justify-between text-sm ${quote.coupon.valid ? "text-green-700" : "text-red-600"}`} data-testid="coupon-message">
              <span>{quote.coupon.message}</span>
              <button type="button" className="text-xs text-muted underline" onClick={() => { setCouponCode(null); setCouponInput(""); }} data-testid="remove-coupon">
                Remove
              </button>
            </div>
          )}
          <div className="mt-6">
            {error && <p className="field-error text-sm" data-testid="quote-error">{error}</p>}
            <OrderSummary quote={quote} loading={loading} />
          </div>
          <Link
            href={quote?.valid ? "/checkout" : "#"}
            aria-disabled={!quote?.valid}
            className={`btn-primary mt-6 w-full ${quote?.valid ? "" : "pointer-events-none opacity-50"}`}
            data-testid="checkout-button"
          >
            Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-muted">Secure demo checkout · no real payment</p>
        </aside>
      </div>
    </div>
  );
}

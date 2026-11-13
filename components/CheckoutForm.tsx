"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COUNTRIES, imageUrl, formatEUR } from "@/lib/catalog-meta";
import { useQuote } from "@/lib/useQuote";
import { useCart } from "./cart";
import OrderSummary from "./OrderSummary";

type Props = {
  customer: { email: string; fullName: string } | null;
  address: { street: string; city: string; postalCode: string; country: string } | null;
};

export default function CheckoutForm({ customer, address }: Props) {
  const router = useRouter();
  const { lines, ready, couponCode, clear } = useCart();
  const { quote, loading } = useQuote(lines, couponCode, ready);

  const [email, setEmail] = useState("");
  const [ship, setShip] = useState({
    fullName: customer?.fullName ?? "",
    street: address?.street ?? "",
    city: address?.city ?? "",
    postalCode: address?.postalCode ?? "",
    country: address?.country ?? "DE",
  });
  const [pay, setPay] = useState({ cardNumber: "", expiry: "", cvc: "", nameOnCard: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!ready) return <p className="mt-8 text-muted">Loading…</p>;
  if (lines.length === 0)
    return (
      <div className="mt-8" data-testid="checkout-empty">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-4">Go shopping</Link>
      </div>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
          couponCode,
          email,
          shipping: ship,
          payment: pay,
        }),
      });
      const data = await res.json();
      if (res.status === 201) {
        clear();
        router.push(`/order/${data.orderNumber}?t=${data.accessToken}`);
        return;
      }
      if (data.fieldErrors) setFieldErrors(data.fieldErrors);
      setFormError(data.error ?? "Something went wrong");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k: string) => fieldErrors[k];
  const field = (
    k: keyof typeof ship,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label className="label" htmlFor={`ship-${k}`}>{label}</label>
      <input
        id={`ship-${k}`}
        className="input"
        value={ship[k]}
        onChange={(e) => setShip({ ...ship, [k]: e.target.value })}
        aria-invalid={!!err(`shipping.${k}`)}
        data-testid={`shipping-${k}`}
        {...extra}
      />
      {err(`shipping.${k}`) && <p className="field-error" data-testid={`error-shipping-${k}`}>{err(`shipping.${k}`)}</p>}
    </div>
  );
  const payField = (k: keyof typeof pay, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`pay-${k}`}>{label}</label>
      <input
        id={`pay-${k}`}
        className="input"
        value={pay[k]}
        onChange={(e) => setPay({ ...pay, [k]: e.target.value })}
        aria-invalid={!!err(`payment.${k}`)}
        data-testid={`payment-${k}`}
        {...extra}
      />
      {err(`payment.${k}`) && <p className="field-error" data-testid={`error-payment-${k}`}>{err(`payment.${k}`)}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]" data-testid="checkout-form">
      <div className="space-y-10">
        {formError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700" data-testid="checkout-error">
            {formError}
          </div>
        )}

        <section>
          <h2 className="text-lg font-black">1. Contact</h2>
          {customer ? (
            <p className="mt-3 text-sm" data-testid="logged-in-as">Ordering as <b>{customer.email}</b></p>
          ) : (
            <div className="mt-4">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err("email")} autoComplete="email" data-testid="checkout-email" />
              {err("email") && <p className="field-error" data-testid="error-email">{err("email")}</p>}
              <p className="mt-2 text-xs text-muted">
                Have an account? <Link href="/login?next=/checkout" className="underline">Log in</Link> for faster checkout.
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-black">2. Shipping address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("fullName", "Full name", { autoComplete: "name" })}</div>
            <div className="sm:col-span-2">{field("street", "Street & house number", { autoComplete: "street-address" })}</div>
            {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
            {field("city", "City", { autoComplete: "address-level2" })}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ship-country">Country</label>
              <select id="ship-country" className="input" value={ship.country} onChange={(e) => setShip({ ...ship, country: e.target.value })} data-testid="shipping-country">
                {Object.entries(COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-black">3. Payment</h2>
          <p className="mt-2 rounded-xl bg-lime/30 px-4 py-3 text-xs" data-testid="test-card-hint">
            Demo store: no real money is charged. Use test card <b>4242 4242 4242 4242</b>, any future expiry, any CVC.
            Declines: <b>4000 0000 0000 0002</b>. More on the <Link href="/qa" className="underline">QA page</Link>.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{payField("cardNumber", "Card number", { inputMode: "numeric", autoComplete: "off", placeholder: "4242 4242 4242 4242" })}</div>
            {payField("expiry", "Expiry (MM/YY)", { placeholder: "12/29", autoComplete: "off" })}
            {payField("cvc", "CVC", { inputMode: "numeric", placeholder: "123", autoComplete: "off" })}
            <div className="sm:col-span-2">{payField("nameOnCard", "Name on card", { autoComplete: "off" })}</div>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-line bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-lg font-black">Your order</h2>
        <ul className="mt-4 space-y-3" data-testid="checkout-lines">
          {lines.map((l) => (
            <li key={`${l.productId}-${l.size}-${l.color}`} className="flex items-center gap-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(l.imageKey, l.color)} alt="" className="h-16 w-13 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="line-clamp-1 font-semibold">{l.name}</p>
                <p className="text-xs text-muted">{l.color} · {l.size} · ×{l.quantity}</p>
              </div>
              <span>{formatEUR(l.unitCents * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-line pt-4">
          <OrderSummary quote={quote} loading={loading} />
        </div>
        <button type="submit" disabled={submitting || !quote?.valid} className="btn-primary mt-6 w-full py-4" data-testid="place-order">
          {submitting ? "Placing order…" : quote ? `Pay ${formatEUR(quote.totalCents)}` : "Place order"}
        </button>
        {quote && !quote.valid && (
          <p className="mt-2 text-center text-xs text-red-600">Some items need attention. <Link href="/cart" className="underline">Review cart</Link></p>
        )}
      </aside>
    </form>
  );
}

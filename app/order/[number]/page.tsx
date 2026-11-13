import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrderForViewer } from "@/lib/checkout";
import { COUNTRIES, formatEUR, imageUrl } from "@/lib/catalog-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> };

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-200 text-gray-800",
};

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, { t }, session] = await Promise.all([params, searchParams, getSession()]);
  const order = await getOrderForViewer(number, { customerId: session?.customerId, token: t });
  if (!order) notFound();
  const justPlaced = order.status === "PAID" && Date.now() - new Date(order.created_at).getTime() < 10 * 60 * 1000;

  return (
    <div className="container-x max-w-4xl py-12">
      {justPlaced && (
        <div className="mb-8 rounded-3xl bg-lime p-8" data-testid="order-success">
          <p className="text-3xl font-black">Thank you for your order!</p>
          <p className="mt-1 text-sm">A confirmation would be sent to {order.email} (demo: no email is sent).</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="text-3xl font-black tracking-tight" data-testid="order-number">{order.order_number}</h1>
          <p className="text-sm text-muted">Placed {order.created_at.slice(0, 10)}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${STATUS_STYLE[order.status] ?? ""}`} data-testid="order-status">{order.status}</span>
      </div>

      <ul className="mt-8 divide-y divide-line rounded-3xl border border-line bg-white px-6" data-testid="order-items">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-4 py-4 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(i.image_key, i.color)} alt="" className="h-20 w-16 rounded-lg object-cover" />
            <div className="flex-1">
              <Link href={`/product/${i.slug}`} className="font-semibold hover:underline">{i.product_name}</Link>
              <p className="text-xs text-muted">{i.color} · {i.size} · ×{i.quantity}</p>
            </div>
            <span className="font-semibold">{formatEUR(i.unit_cents * i.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-white p-6 text-sm" data-testid="order-shipping">
          <p className="label">Ship to</p>
          <p className="font-semibold">{order.ship_name}</p>
          <p>{order.ship_street}</p>
          <p>{order.ship_postal_code} {order.ship_city}</p>
          <p>{COUNTRIES[order.ship_country ?? ""] ?? order.ship_country}</p>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 text-sm" data-testid="order-payment">
          <p className="label">Payment</p>
          <p className="font-semibold">{order.card_brand ?? "Card"} {order.card_last4 ? `•••• ${order.card_last4}` : ""}</p>
          <p className="text-muted">Status: {order.payment_status ?? "n/a"}</p>
        </div>
        <dl className="space-y-2 rounded-3xl border border-line bg-white p-6 text-sm" data-testid="order-totals">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEUR(order.subtotal_cents)}</dd></div>
          {order.discount_cents > 0 && <div className="flex justify-between text-green-700"><dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd>−{formatEUR(order.discount_cents)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shipping_cents === 0 ? "Free" : formatEUR(order.shipping_cents)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-black"><dt>Total</dt><dd data-testid="order-total">{formatEUR(order.total_cents)}</dd></div>
        </dl>
      </div>
      <div className="mt-10 flex gap-3">
        <Link href="/shop" className="btn-primary">Continue shopping</Link>
        {session && <Link href="/account" className="btn-ghost">My orders</Link>}
      </div>
    </div>
  );
}

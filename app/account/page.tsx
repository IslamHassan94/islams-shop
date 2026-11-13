import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getCustomer, getSession } from "@/lib/auth";
import { listCustomerOrders } from "@/lib/checkout";
import { formatEUR } from "@/lib/catalog-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const [customer, orders] = await Promise.all([getCustomer(session.customerId), listCustomerOrders(session.customerId)]);
  if (!customer) redirect("/login?next=/account");

  return (
    <div className="container-x max-w-5xl py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="text-4xl font-black tracking-tight" data-testid="account-name">
            {customer.first_name} {customer.last_name} {customer.is_vip && <span className="ml-2 rounded-full bg-lime px-3 py-1 align-middle text-xs">VIP</span>}
          </h1>
          <p className="text-sm text-muted" data-testid="account-email">{customer.email} · member since {customer.member_since}</p>
        </div>
        <LogoutButton />
      </div>

      {customer.status === "PENDING_VERIFICATION" && (
        <p className="mt-6 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800" data-testid="verify-banner">
          Please verify your email address to unlock all account features.
        </p>
      )}

      <h2 className="mt-12 text-2xl font-black tracking-tight">Order history</h2>
      {orders.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-line p-10 text-center" data-testid="no-orders">
          <p className="font-semibold">No orders yet</p>
          <Link href="/shop" className="btn-primary mt-4">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full text-left text-sm" data-testid="orders-table">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-6 py-4">Order</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Items</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.order_number} data-testid="order-row">
                  <td className="px-6 py-4 font-semibold"><Link href={`/order/${o.order_number}`} className="underline">{o.order_number}</Link></td>
                  <td className="px-6 py-4">{o.created_at}</td>
                  <td className="px-6 py-4">{o.item_count}</td>
                  <td className="px-6 py-4" data-testid="order-row-status">{o.status}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatEUR(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

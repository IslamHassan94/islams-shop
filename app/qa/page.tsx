import { TEST_CARDS } from "@/lib/checkout";

export const metadata = { title: "QA playground" };

const ACCOUNTS = [
  ["demo@islamsshop.test", "Active, has orders in every status"],
  ["new.no.orders@islamsshop.test", "Active, no orders yet"],
  ["vip.big.spender@islamsshop.test", "VIP with 25 orders"],
  ["blocked.user@islamsshop.test", "BLOCKED: login is refused (403)"],
  ["pending.verify@islamsshop.test", "Pending email verification banner"],
  ["unicode.umlaut@islamsshop.test", "Unicode name (Jürgen Groß-Öztürk)"],
  ["no.address@islamsshop.test", "No saved address: checkout form starts empty"],
  ["customer1..200@islamsshop.test", "Generated customers (every 25th is blocked, every 17th inactive)"],
];

const COUPONS = [
  ["WELCOME10", "10% off, always valid"],
  ["SAVE20", "€20 off, minimum order €100"],
  ["EXPIRED50", "Expired: rejected"],
  ["FUTURE15", "Not started yet: rejected"],
  ["USEDUP5", "Usage limit reached: rejected"],
  ["DISABLED25", "Deactivated: rejected"],
];

const PRODUCTS = [
  ["/product/neon-pulse-leggings-limited", "Out of stock: add-to-cart disabled"],
  ["/product/last-chance-seamless-bra", "Only 2 in stock + 50% sale price"],
  ["/product/free-gift-mini-resistance-band", "Price €0.00"],
  ["/product/signature-cashmere-hoodie", "€899: triggers free shipping"],
  ["/product/gruesse-yoga-hose-edition", "Unicode product name"],
  ["/product/ultra-long-name-training-tee", "Very long name (truncation)"],
  ["/product/retired-classic-tank", "Inactive product: 404"],
];

function Table({ rows, head, testid }: { rows: string[][]; head: string[]; testid: string }) {
  return (
    <table className="mt-4 w-full overflow-hidden rounded-2xl border border-line bg-white text-left text-sm" data-testid={testid}>
      <thead className="bg-paper text-xs uppercase tracking-wide text-muted"><tr>{head.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={`px-4 py-3 ${i === 0 ? "font-mono text-xs" : ""}`}>{c}</td>)}</tr>)}
      </tbody>
    </table>
  );
}

export default function QaPage() {
  return (
    <div className="container-x max-w-4xl py-12">
      <p className="eyebrow">For testers & AI agents</p>
      <h1 className="text-4xl font-black tracking-tight">QA playground</h1>
      <p className="mt-2 text-muted">Everything here is fake. Use these values to drive positive and negative test scenarios.</p>

      <h2 className="mt-10 text-xl font-black">Test cards</h2>
      <p className="text-sm text-muted">Any future expiry (e.g. 12/29), any CVC. Any other Luhn-valid number succeeds.</p>
      <Table testid="qa-cards" head={["Card number", "Result"]} rows={Object.entries(TEST_CARDS).map(([n, v]) => [n.replace(/(\d{4})(?=\d)/g, "$1 "), v.message])} />

      <h2 className="mt-10 text-xl font-black">Accounts</h2>
      <p className="text-sm text-muted">Password for every seeded account: <b>Test@1234</b></p>
      <Table testid="qa-accounts" head={["Email", "Scenario"]} rows={ACCOUNTS} />

      <h2 className="mt-10 text-xl font-black">Coupons</h2>
      <Table testid="qa-coupons" head={["Code", "Behaviour"]} rows={COUPONS} />

      <h2 className="mt-10 text-xl font-black">Edge-case products</h2>
      <Table testid="qa-products" head={["URL", "Scenario"]} rows={PRODUCTS} />

      <h2 className="mt-10 text-xl font-black">Business rules</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        <li>Shipping €4.99, free when (subtotal − discount) ≥ €75</li>
        <li>Max 10 per cart line, max 30 lines</li>
        <li>Prices and stock are re-checked on the server at checkout</li>
        <li>Declined payments create a CANCELLED order with a FAILED payment row and don&apos;t reduce stock</li>
        <li>Postal codes validated for DE (5 digits), AT/BE (4 digits), NL (1234 AB)</li>
      </ul>
    </div>
  );
}

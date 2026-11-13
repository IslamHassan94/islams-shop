import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white" data-testid="site-footer">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-black">
            ISLAM&apos;S <span className="rounded bg-lime px-1.5 text-ink">SHOP</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            Fitness wear for people who show up. Demo store built for test-automation and AI-agent practice.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Shop</p>
          <ul className="space-y-2 text-white/70">
            <li><Link href="/shop?gender=women">Women</Link></li>
            <li><Link href="/shop?gender=men">Men</Link></li>
            <li><Link href="/shop?category=accessories">Accessories</Link></li>
            <li><Link href="/shop?sale=1">Sale</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Account</p>
          <ul className="space-y-2 text-white/70">
            <li><Link href="/login">Log in</Link></li>
            <li><Link href="/register">Create account</Link></li>
            <li><Link href="/account">My orders</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">For testers</p>
          <ul className="space-y-2 text-white/70">
            <li><Link href="/qa" data-testid="footer-qa-link">QA playground: test cards, coupons, accounts</Link></li>
            <li><a href="/api/health">API health</a></li>
            <li><a href="/api/products">Products API</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Islam&apos;s Shop · Demo store, no real payments are taken.
      </p>
    </footer>
  );
}

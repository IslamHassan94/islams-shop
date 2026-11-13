"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart";

const NAV = [
  { href: "/shop?gender=women", label: "Women" },
  { href: "/shop?gender=men", label: "Men" },
  { href: "/shop?category=accessories", label: "Accessories" },
  { href: "/shop?sale=1", label: "Sale" },
];

export default function Header({ firstName }: { firstName: string | null }) {
  const { count, ready } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur" data-testid="site-header">
      <div className="bg-ink py-2 text-center text-xs font-medium text-white" data-testid="announcement-bar">
        Free shipping on orders over €75 · New here? Use <span className="font-bold text-lime">WELCOME10</span> for 10% off
      </div>
      <div className="container-x flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0 text-xl font-black tracking-tight" data-testid="logo">
          ISLAM&apos;S <span className="rounded bg-lime px-1.5">SHOP</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-semibold md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:underline underline-offset-4" data-testid={`nav-${n.label.toLowerCase()}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <form
          role="search"
          className="ml-auto hidden max-w-xs flex-1 sm:block"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leggings, hoodies…"
            aria-label="Search products"
            className="w-full rounded-full border border-line bg-white px-4 py-2 text-sm outline-none focus:border-ink"
            data-testid="search-input"
          />
        </form>
        <div className="ml-auto flex items-center gap-4 sm:ml-0">
          <Link
            href={firstName ? "/account" : `/login?next=${encodeURIComponent(pathname)}`}
            className="text-sm font-semibold hover:underline underline-offset-4"
            data-testid="account-link"
          >
            {firstName ? `Hi, ${firstName}` : "Log in"}
          </Link>
          <Link href="/cart" className="relative rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white" data-testid="cart-link">
            Cart
            <span
              className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1 text-xs font-bold text-ink"
              data-testid="cart-count"
            >
              {ready ? count : 0}
            </span>
          </Link>
        </div>
      </div>
      <nav className="container-x flex gap-5 overflow-x-auto pb-3 text-sm font-semibold md:hidden" aria-label="Mobile">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0" data-testid={`mobile-nav-${n.label.toLowerCase()}`}>
            {n.label}
          </Link>
        ))}
        <Link href="/shop" className="shrink-0">Search</Link>
      </nav>
    </header>
  );
}

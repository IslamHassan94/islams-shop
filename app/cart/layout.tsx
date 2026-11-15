import type { Metadata } from "next";

// The cart page is a client component, so its title is set here (root template adds " · Islam's Shop").
export const metadata: Metadata = { title: "Cart" };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Islam's Shop: Fitness Wear", template: "%s · Islam's Shop" },
  description: "Leggings, sports bras, hoodies and more. Demo store for test automation practice.",
};

// Aurora Serverless can take ~15s to resume from 0 ACU: allow long server responses on Vercel.
export const maxDuration = 60;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <CartProvider>
          <Header firstName={session?.firstName ?? null} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

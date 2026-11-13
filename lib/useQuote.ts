"use client";

import { useEffect, useState } from "react";
import type { CartLine } from "@/components/cart";
import type { Quote } from "./checkout";

/** Asks the server to price the cart (prices, stock, coupon) whenever it changes. */
export function useQuote(lines: CartLine[], couponCode: string | null, ready: boolean) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify(lines.map((l) => [l.productId, l.size, l.color, l.quantity])) + "|" + (couponCode ?? "");

  useEffect(() => {
    if (!ready) return;
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
        couponCode,
      }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not price your cart");
        setQuote(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { quote, loading, error };
}

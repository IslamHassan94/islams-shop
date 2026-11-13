"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/catalog-meta";

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  imageKey: string;
  size: string;
  color: string;
  quantity: number;
  unitCents: number;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: CartLine) => void;
  setQuantity: (productId: number, size: string, color: string, quantity: number) => void;
  remove: (productId: number, size: string, color: string) => void;
  clear: () => void;
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
};

const STORAGE_KEY = "islams-shop-cart";
const COUPON_KEY = "islams-shop-coupon";
const Ctx = createContext<CartCtx | null>(null);
const same = (a: CartLine, p: number, s: string, c: string) => a.productId === p && a.size === s && a.color === c;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [couponCode, setCoupon] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
      setCoupon(localStorage.getItem(COUPON_KEY));
    } catch {
      /* ignore broken storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => same(l, line.productId, line.size, line.color));
      if (existing)
        return prev.map((l) =>
          l === existing ? { ...l, quantity: Math.min(MAX_QTY_PER_LINE, l.quantity + line.quantity) } : l,
        );
      return [...prev, line];
    });
  }, []);

  const setQuantity = useCallback((p: number, s: string, c: string, q: number) => {
    setLines((prev) => prev.map((l) => (same(l, p, s, c) ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY_PER_LINE, q)) } : l)));
  }, []);

  const remove = useCallback((p: number, s: string, c: string) => {
    setLines((prev) => prev.filter((l) => !same(l, p, s, c)));
  }, []);

  const setCouponCode = useCallback((code: string | null) => {
    setCoupon(code);
    try {
      if (code) localStorage.setItem(COUPON_KEY, code);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setCouponCode(null);
  }, [setCouponCode]);

  const value = useMemo(
    () => ({ lines, ready, count: lines.reduce((n, l) => n + l.quantity, 0), add, setQuantity, remove, clear, couponCode, setCouponCode }),
    [lines, ready, add, setQuantity, remove, clear, couponCode, setCouponCode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

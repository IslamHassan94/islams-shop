"use client";

import Link from "next/link";
import { useState } from "react";
import { COLORS, MAX_QTY_PER_LINE, imageUrl, splitList } from "@/lib/catalog-meta";
import type { ProductDetail } from "@/lib/catalog";
import { useCart } from "./cart";
import Price from "./Price";

export default function ProductPurchase({ p }: { p: ProductDetail }) {
  const colors = splitList(p.colors);
  const sizes = splitList(p.sizes);
  const { add } = useCart();
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const soldOut = p.available <= 0;

  function onAdd() {
    setError("");
    if (!size) {
      setError("Please select a size");
      return;
    }
    add({ productId: p.id, slug: p.slug, name: p.name, imageKey: p.image_key, size, color, quantity: qty, unitCents: p.price_cents });
    setAdded(true);
    setTimeout(() => setAdded(false), 4000);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="overflow-hidden rounded-3xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(p.image_key, color)} alt={`${p.name} in ${color}`} className="aspect-[4/5] w-full object-cover" data-testid="product-image" />
      </div>

      <div className="lg:pt-6">
        <p className="eyebrow">{p.category} · {p.gender === "UNISEX" ? "Unisex" : p.gender === "WOMEN" ? "Women" : "Men"}</p>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl" data-testid="product-title">{p.name}</h1>
        <div className="mt-4 flex items-center gap-4">
          <Price cents={p.price_cents} compareAt={p.compare_at_cents} className="text-2xl" />
          <span className="text-xs text-muted">SKU {p.sku}</span>
        </div>

        <div className="mt-8">
          <p className="label">Colour: <span className="text-ink" data-testid="selected-color">{color}</span></p>
          <div className="flex gap-3" role="radiogroup" aria-label="Colour">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                onClick={() => setColor(c)}
                className={`h-10 w-10 rounded-full border-2 transition ${c === color ? "border-ink ring-2 ring-lime ring-offset-2" : "border-black/10"}`}
                style={{ background: COLORS[c] }}
                data-testid={`color-${c.toLowerCase().replace(/\s+/g, "-")}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="label">Size</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={s === size}
                onClick={() => { setSize(s); setError(""); }}
                className={`min-w-14 rounded-xl border px-4 py-3 text-sm font-semibold transition ${s === size ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}
                data-testid={`size-${s.toLowerCase().replace("/", "-")}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-end gap-3">
          <div>
            <label className="label" htmlFor="qty">Quantity</label>
            <select id="qty" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input w-24" data-testid="quantity-select" disabled={soldOut}>
              {Array.from({ length: Math.max(1, Math.min(MAX_QTY_PER_LINE, p.available)) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={onAdd} disabled={soldOut} className="btn-primary flex-1 py-3.5" data-testid="add-to-cart">
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>

        <div aria-live="polite" className="min-h-6">
          {error && <p className="field-error text-sm" data-testid="add-to-cart-error">{error}</p>}
          {added && (
            <p className="mt-3 rounded-xl bg-lime/40 px-4 py-3 text-sm font-medium" data-testid="added-to-cart-message">
              Added to cart. <Link href="/cart" className="font-bold underline">View cart</Link>
            </p>
          )}
        </div>

        <p className="mt-2 text-sm" data-testid="stock-status">
          {soldOut ? (
            <span className="font-semibold text-red-600">Out of stock</span>
          ) : p.available <= 5 ? (
            <span className="font-semibold text-orange-600">Only {p.available} left, order soon</span>
          ) : (
            <span className="text-green-700">In stock · ships in 1-2 days</span>
          )}
        </p>

        <div className="mt-8 border-t border-line pt-6 text-sm leading-relaxed text-muted" data-testid="product-description">
          {p.description}
        </div>
      </div>
    </div>
  );
}

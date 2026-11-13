import Link from "next/link";
import type { ProductSummary } from "@/lib/catalog";
import { COLORS, imageUrl, splitList } from "@/lib/catalog-meta";
import Price from "./Price";
import Stars from "./Stars";

export default function ProductCard({ p }: { p: ProductSummary }) {
  const colors = splitList(p.colors);
  const onSale = p.compare_at_cents != null && p.compare_at_cents > p.price_cents;
  const soldOut = p.available <= 0;
  const lowStock = !soldOut && p.available <= 5;
  return (
    <Link href={`/product/${p.slug}`} className="group block" data-testid="product-card" data-product-id={p.id} data-sku={p.sku}>
      <div className="relative overflow-hidden rounded-2xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(p.image_key, colors[0])}
          alt={`${p.name} in ${colors[0]}`}
          className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {onSale && <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white" data-testid="badge-sale">SALE</span>}
          {soldOut && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white" data-testid="badge-sold-out">SOLD OUT</span>}
          {lowStock && <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold" data-testid="badge-low-stock">ONLY {p.available} LEFT</span>}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-muted">{p.category}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug" data-testid="product-name">{p.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <Price cents={p.price_cents} compareAt={p.compare_at_cents} className="text-sm" />
          {p.review_count > 0 && <Stars rating={p.rating} count={p.review_count} />}
        </div>
        <div className="flex gap-1.5 pt-1" aria-label="Available colours">
          {colors.map((c) => (
            <span key={c} title={c} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: COLORS[c] }} />
          ))}
        </div>
      </div>
    </Link>
  );
}

import { formatEUR } from "@/lib/catalog-meta";

export default function Price({ cents, compareAt, className = "" }: { cents: number; compareAt?: number | null; className?: string }) {
  const onSale = compareAt != null && compareAt > cents;
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className={onSale ? "font-bold text-red-600" : "font-bold"} data-testid="price">
        {cents === 0 ? "Free" : formatEUR(cents)}
      </span>
      {onSale && (
        <span className="text-sm text-muted line-through" data-testid="compare-at-price">
          {formatEUR(compareAt!)}
        </span>
      )}
    </span>
  );
}

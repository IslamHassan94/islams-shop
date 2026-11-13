export default function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" aria-label={`Rated ${rating.toFixed(1)} out of 5`} data-testid="rating">
      <span className="tracking-tight text-ink">
        {"★".repeat(full)}
        <span className="text-ink/20">{"★".repeat(5 - full)}</span>
      </span>
      {count !== undefined && <span>({count})</span>}
    </span>
  );
}

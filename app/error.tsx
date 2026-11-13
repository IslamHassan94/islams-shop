"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x py-24 text-center" data-testid="error-page">
      <p className="text-4xl font-black">Something went wrong</p>
      <p className="mt-3 text-muted">The database may be waking up (it pauses when idle). Give it a few seconds.</p>
      <button className="btn-primary mt-8" onClick={reset}>Try again</button>
    </div>
  );
}

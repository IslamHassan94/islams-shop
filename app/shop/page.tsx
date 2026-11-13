import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import { listCategories, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop" };

type SP = Promise<Record<string, string | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filter = {
    category: sp.category,
    gender: sp.gender,
    q: sp.q,
    sort: sp.sort,
    sale: sp.sale === "1",
    page: Number(sp.page ?? 1) || 1,
  };
  const [result, categories] = await Promise.all([listProducts(filter), listCategories()]);

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && next.set(k, v));
    if (!("page" in patch)) next.delete("page");
    const s = next.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  const activeCategory = categories.find((c) => c.slug === sp.category);
  const title = sp.q ? `Results for “${sp.q}”` : sp.sale === "1" ? "Sale" : activeCategory?.name ?? (sp.gender ? `${sp.gender[0].toUpperCase()}${sp.gender.slice(1)}` : "All products");

  const chip = (active: boolean) =>
    `block rounded-full px-3 py-1.5 text-sm ${active ? "bg-ink font-semibold text-white" : "hover:bg-black/5"}`;

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight" data-testid="shop-title">{title}</h1>
          <p className="mt-1 text-sm text-muted" data-testid="result-count">{result.total} products</p>
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-8" data-testid="filters">
          <div>
            <p className="label">Category</p>
            <ul className="space-y-1">
              <li><Link className={chip(!sp.category)} href={href({ category: undefined })}>All</Link></li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link className={chip(sp.category === c.slug)} href={href({ category: c.slug })} data-testid={`filter-category-${c.slug}`}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">Gender</p>
            <ul className="space-y-1">
              {[["", "All"], ["women", "Women"], ["men", "Men"]].map(([v, l]) => (
                <li key={l}>
                  <Link className={chip((sp.gender ?? "") === v)} href={href({ gender: v || undefined })} data-testid={`filter-gender-${l.toLowerCase()}`}>
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">Offers</p>
            <Link className={chip(sp.sale === "1")} href={href({ sale: sp.sale === "1" ? undefined : "1" })} data-testid="filter-sale">
              On sale only
            </Link>
          </div>
        </aside>

        <section>
          {result.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-16 text-center" data-testid="empty-results">
              <p className="text-lg font-semibold">No products found</p>
              <p className="mt-1 text-sm text-muted">Try another search or clear the filters.</p>
              <Link href="/shop" className="btn-primary mt-6">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3" data-testid="product-grid">
              {result.items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}

          {result.totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination" data-testid="pagination">
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={href({ page: String(n) })}
                  aria-current={n === result.page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${n === result.page ? "bg-ink text-white" : "border border-line hover:border-ink"}`}
                  data-testid={`page-${n}`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { listCategories, listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const CATEGORY_ART: Record<string, string> = {
  leggings: "/img/leggings/sage",
  "sports-bras": "/img/bra/rose",
  tops: "/img/tee/electric-blue",
  shorts: "/img/shorts/navy",
  "hoodies-jackets": "/img/hoodie/sand",
  joggers: "/img/joggers/charcoal",
  accessories: "/img/bag/black",
};

export default async function HomePage() {
  const [featured, newest, categories] = await Promise.all([
    listProducts({ sort: "featured", pageSize: 8 }),
    listProducts({ sort: "newest", pageSize: 4 }),
    listCategories(),
  ]);

  return (
    <>
      <section className="container-x grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20" data-testid="hero">
        <div>
          <p className="eyebrow">New season · Autumn drop</p>
          <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            BUILT FOR
            <br />
            THE <span className="rounded-xl bg-lime px-3">GRIND.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Squat-proof leggings, supportive bras and recovery layers designed to keep up with every rep.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop?gender=women" className="btn-primary" data-testid="hero-shop-women">Shop Women</Link>
            <Link href="/shop?gender=men" className="btn-ghost" data-testid="hero-shop-men">Shop Men</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/leggings/sage" alt="AeroFlex leggings in sage" className="aspect-[4/5] w-full rounded-3xl object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/hoodie/black" alt="Recovery hoodie in black" className="mt-12 aspect-[4/5] w-full rounded-3xl object-cover" />
        </div>
      </section>

      <section className="container-x" data-testid="category-grid">
        <h2 className="text-2xl font-black tracking-tight">Shop by category</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="group" data-testid={`category-${c.slug}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CATEGORY_ART[c.slug] ?? "/img/tee/black"} alt="" className="aspect-square w-full rounded-2xl object-cover transition group-hover:scale-[1.03]" />
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted">{c.product_count} products</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-16" data-testid="bestsellers">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black tracking-tight">Bestsellers</h2>
          <Link href="/shop" className="text-sm font-semibold underline underline-offset-4">View all</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {featured.items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-10 text-white sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow text-white/50">Limited offer</p>
            <p className="mt-2 text-3xl font-black">€20 off orders over €100</p>
            <p className="mt-1 text-white/60">Use code <span className="font-bold text-lime">SAVE20</span> at checkout.</p>
          </div>
          <Link href="/shop?sale=1" className="btn-lime">Shop the sale</Link>
        </div>
      </section>

      <section className="container-x mt-16" data-testid="new-arrivals">
        <h2 className="text-2xl font-black tracking-tight">New arrivals</h2>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {newest.items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </>
  );
}

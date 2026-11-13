import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductPurchase from "@/components/ProductPurchase";
import Stars from "@/components/Stars";
import { getProduct, getRelated, getReviews } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const p = await getProduct((await params).slug);
  return { title: p?.name ?? "Product not found" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [reviews, related] = await Promise.all([getReviews(product.id), getRelated(product.category_slug, product.id)]);

  return (
    <div className="container-x py-10">
      <ProductPurchase p={product} />

      <section className="mt-20" data-testid="reviews">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black tracking-tight">Reviews</h2>
          {product.review_count > 0 && <Stars rating={product.rating} count={product.review_count} />}
        </div>
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted" data-testid="no-reviews">No reviews yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-white p-5" data-testid="review">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-muted">{r.created_at}</span>
                </div>
                <p className="mt-3 text-sm">{r.comment ?? <span className="italic text-muted">No comment</span>}</p>
                <p className="mt-2 text-xs font-semibold">{r.author}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-20" data-testid="related-products">
          <h2 className="text-2xl font-black tracking-tight">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

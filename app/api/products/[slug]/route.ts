import { getProduct, getReviews } from "@/lib/catalog";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) return json({ error: "Product not found", code: "NOT_FOUND" }, 404);
    return json({ ...product, reviews: await getReviews(product.id) });
  } catch (e) {
    return errorResponse(e);
  }
}

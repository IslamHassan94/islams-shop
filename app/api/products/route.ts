import { listProducts } from "@/lib/catalog";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/products?category=leggings&gender=women&q=bra&sort=price-asc&sale=1&page=1&pageSize=12
export async function GET(req: Request) {
  try {
    const u = new URL(req.url).searchParams;
    const result = await listProducts({
      category: u.get("category") ?? undefined,
      gender: u.get("gender") ?? undefined,
      q: u.get("q") ?? undefined,
      sort: u.get("sort") ?? undefined,
      sale: u.get("sale") === "1",
      page: Number(u.get("page") ?? 1) || 1,
      pageSize: Number(u.get("pageSize") ?? 12) || 12,
    });
    return json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

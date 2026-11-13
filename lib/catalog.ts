import { db } from "./db";

export type ProductSummary = {
  id: number;
  sku: string;
  slug: string;
  name: string;
  price_cents: number;
  compare_at_cents: number | null;
  image_key: string;
  colors: string;
  sizes: string;
  gender: string;
  category: string;
  category_slug: string;
  available: number;
  rating: number;
  review_count: number;
};

export type ProductDetail = ProductSummary & { description: string | null };

export type Review = {
  id: number;
  rating: number;
  comment: string | null;
  author: string;
  created_at: string;
};

export type Category = { slug: string; name: string; product_count: number };

const SELECT_PRODUCT = `
  SELECT p.id, p.sku, p.slug, p.name, p.description,
         (p.price * 100)::int                 AS price_cents,
         (p.compare_at_price * 100)::int      AS compare_at_cents,
         p.image_key, p.colors, p.sizes, p.gender,
         c.name AS category, c.slug AS category_slug,
         (i.quantity - i.reserved)            AS available,
         COALESCE(r.avg_rating, 0)::float8    AS rating,
         COALESCE(r.cnt, 0)::int              AS review_count
  FROM shop.products p
  JOIN shop.categories c ON c.id = p.category_id
  JOIN shop.inventory  i ON i.product_id = p.id
  LEFT JOIN (SELECT product_id, avg(rating) AS avg_rating, count(*) AS cnt
             FROM shop.reviews GROUP BY product_id) r ON r.product_id = p.id`;

const ORDER_BY: Record<string, string> = {
  featured: "p.is_featured DESC, review_count DESC, p.id",
  newest: "p.created_at DESC, p.id",
  "price-asc": "p.price ASC, p.id",
  "price-desc": "p.price DESC, p.id",
  rating: "rating DESC, review_count DESC, p.id",
};

export type ProductFilter = {
  category?: string;
  gender?: string;
  q?: string;
  sort?: string;
  sale?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listProducts(f: ProductFilter = {}) {
  const pageSize = Math.min(Math.max(f.pageSize ?? 12, 1), 48);
  const page = Math.max(f.page ?? 1, 1);
  const gender = ["WOMEN", "MEN"].includes((f.gender ?? "").toUpperCase()) ? f.gender!.toUpperCase() : "";
  const params = {
    category: f.category ?? "",
    gender,
    q: (f.q ?? "").trim().slice(0, 80),
    sale: f.sale ? 1 : 0,
  };
  const where = `
    WHERE p.is_active
      AND (CAST(:category AS text) = '' OR c.slug = CAST(:category AS text))
      AND (CAST(:gender AS text) = '' OR p.gender = CAST(:gender AS text) OR p.gender = 'UNISEX')
      AND (CAST(:q AS text) = '' OR p.name ILIKE '%' || CAST(:q AS text) || '%' OR c.name ILIKE '%' || CAST(:q AS text) || '%')
      AND (CAST(:sale AS int) = 0 OR p.compare_at_price IS NOT NULL)`;
  const orderBy = ORDER_BY[f.sort ?? "featured"] ?? ORDER_BY.featured;

  const [items, countRows] = await Promise.all([
    db.query<ProductSummary>(
      `${SELECT_PRODUCT} ${where} ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
      { ...params, limit: pageSize, offset: (page - 1) * pageSize },
    ),
    db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM shop.products p JOIN shop.categories c ON c.id = p.category_id ${where}`,
      params,
    ),
  ]);
  const total = countRows[0]?.total ?? 0;
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const rows = await db.query<ProductDetail>(`${SELECT_PRODUCT} WHERE p.slug = :slug AND p.is_active`, { slug });
  return rows[0] ?? null;
}

export async function getReviews(productId: number): Promise<Review[]> {
  return db.query<Review>(
    `SELECT r.id, r.rating, r.comment,
            cu.first_name || ' ' || left(cu.last_name, 1) || '.' AS author,
            to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS created_at
     FROM shop.reviews r JOIN shop.customers cu ON cu.id = r.customer_id
     WHERE r.product_id = :id
     ORDER BY r.created_at DESC LIMIT 20`,
    { id: productId },
  );
}

export async function getRelated(categorySlug: string, excludeId: number) {
  return db.query<ProductSummary>(
    `${SELECT_PRODUCT} WHERE p.is_active AND c.slug = :cat AND p.id <> :id ORDER BY review_count DESC LIMIT 4`,
    { cat: categorySlug, id: excludeId },
  );
}

export async function listCategories(): Promise<Category[]> {
  return db.query<Category>(
    `SELECT c.slug, c.name, count(p.id)::int AS product_count
     FROM shop.categories c LEFT JOIN shop.products p ON p.category_id = c.id AND p.is_active
     GROUP BY c.id ORDER BY c.sort`,
  );
}

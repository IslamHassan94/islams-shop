import { renderProductSvg } from "@/lib/art";
import { colorFromSlug } from "@/lib/catalog-meta";

// GET /img/leggings/black  -> generated SVG product image
export async function GET(_req: Request, { params }: { params: Promise<{ key: string; color: string }> }) {
  const { key, color } = await params;
  const colorName = colorFromSlug(color);
  const svg = colorName ? renderProductSvg(key, colorName) : null;
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}

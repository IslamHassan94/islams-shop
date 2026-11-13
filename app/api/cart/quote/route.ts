import { parseCartItems, quoteCart } from "@/lib/checkout";
import { errorResponse, json, readJson } from "@/lib/http";

// POST /api/cart/quote  { items: [{productId,size,color,quantity}], couponCode? }
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const items = parseCartItems(body.items);
    return json(await quoteCart(items, typeof body.couponCode === "string" ? body.couponCode : null));
  } catch (e) {
    return errorResponse(e);
  }
}

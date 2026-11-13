import { getSession } from "@/lib/auth";
import { getOrderForViewer } from "@/lib/checkout";
import { errorResponse, json } from "@/lib/http";

// GET /api/orders/IS-251113-ABC123?t=<accessToken>   (token needed for guest orders)
export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  try {
    const { number } = await params;
    const session = await getSession();
    const token = new URL(req.url).searchParams.get("t");
    const order = await getOrderForViewer(number, { customerId: session?.customerId, token });
    if (!order) return json({ error: "Order not found", code: "NOT_FOUND" }, 404);
    return json(order);
  } catch (e) {
    return errorResponse(e);
  }
}

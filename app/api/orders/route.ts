import { getCustomer, getSession } from "@/lib/auth";
import {
  CheckoutError,
  listCustomerOrders,
  parseCartItems,
  placeOrder,
  validatePayment,
  validateShipping,
} from "@/lib/checkout";
import { errorResponse, json, readJson } from "@/lib/http";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// GET /api/orders -> orders of the logged-in customer
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return json({ error: "Please log in", code: "UNAUTHORIZED" }, 401);
    return json(await listCustomerOrders(session.customerId));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/orders  { items, couponCode?, email (guests), shipping{...}, payment{cardNumber,expiry,cvc,nameOnCard} }
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const items = parseCartItems(body.items);
    const session = await getSession();

    let email = String(body.email ?? "").trim().toLowerCase();
    if (session) {
      const customer = await getCustomer(session.customerId);
      if (!customer) throw new CheckoutError("Session is no longer valid, please log in again", 401, "UNAUTHORIZED");
      if (customer.status === "BLOCKED") throw new CheckoutError("This account is blocked", 403, "ACCOUNT_BLOCKED");
      email = customer.email;
    }

    const shipping = validateShipping((body.shipping ?? {}) as Record<string, unknown>);
    const payment = validatePayment((body.payment ?? {}) as Record<string, unknown>);
    const fieldErrors: Record<string, string> = {
      ...Object.fromEntries(Object.entries(shipping.errors).map(([k, v]) => [`shipping.${k}`, v])),
      ...Object.fromEntries(Object.entries(payment.errors).map(([k, v]) => [`payment.${k}`, v])),
    };
    if (!session && !EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address";
    if (Object.keys(fieldErrors).length)
      return json({ error: "Please fix the highlighted fields", code: "VALIDATION_ERROR", fieldErrors }, 422);

    const result = await placeOrder({
      items,
      couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
      customerId: session?.customerId ?? null,
      email,
      shipping: shipping.value,
      payment: { number: payment.number, brand: payment.brand, last4: payment.last4 },
    });

    if (!result.ok)
      return json({ error: result.message, code: "PAYMENT_FAILED", reason: result.reason, orderNumber: result.orderNumber }, 402);
    return json(result, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

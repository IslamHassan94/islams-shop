/**
 * Server-side cart pricing, coupons, fake payment processing and order creation.
 * Prices always come from the DB: the client only sends product ids, size, colour, qty.
 */
import { randomBytes } from "crypto";
import { db, transaction, type Db } from "./db";
import {
  COUNTRIES,
  FREE_SHIPPING_THRESHOLD_CENTS,
  MAX_QTY_PER_LINE,
  SHIPPING_FEE_CENTS,
  formatEUR,
  splitList,
} from "./catalog-meta";

export type CartItemInput = { productId: number; size: string; color: string; quantity: number };

export type PricedLine = CartItemInput & {
  slug: string;
  name: string;
  imageKey: string;
  unitCents: number;
  lineCents: number;
  available: number;
  error?: string;
};

export type Quote = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  coupon: { code: string; valid: boolean; message: string; couponId?: number } | null;
  valid: boolean;
};

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function parseCartItems(raw: unknown): CartItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new CheckoutError("Your cart is empty", 400, "EMPTY_CART");
  if (raw.length > 30) throw new CheckoutError("Too many cart lines", 400, "CART_TOO_LARGE");
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const item = {
      productId: Number(o.productId),
      size: String(o.size ?? ""),
      color: String(o.color ?? ""),
      quantity: Number(o.quantity),
    };
    if (!Number.isInteger(item.productId) || item.productId <= 0)
      throw new CheckoutError(`Line ${i + 1}: invalid productId`, 400, "INVALID_ITEM");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY_PER_LINE)
      throw new CheckoutError(`Line ${i + 1}: quantity must be 1-${MAX_QTY_PER_LINE}`, 400, "INVALID_QUANTITY");
    return item;
  });
}

type CouponRow = {
  id: number;
  code: string;
  discount_type: string;
  value_cents: number;
  min_cents: number;
  is_active: boolean;
  not_started: boolean;
  expired: boolean;
  used_up: boolean;
};

async function evaluateCoupon(q: Db, codeRaw: string, subtotalCents: number) {
  const code = codeRaw.trim().toUpperCase();
  const rows = await q.query<CouponRow>(
    `SELECT id, code, discount_type,
            (discount_value * 100)::int  AS value_cents,
            (min_order_total * 100)::int AS min_cents,
            is_active,
            valid_from > now() AS not_started,
            valid_to   < now() AS expired,
            (max_uses IS NOT NULL AND times_used >= max_uses) AS used_up
     FROM shop.coupons WHERE upper(code) = :code`,
    { code },
  );
  const c = rows[0];
  const fail = (message: string) => ({ code, valid: false, message, discountCents: 0 });
  if (!c) return fail("Invalid coupon code");
  if (!c.is_active) return fail("This coupon is no longer active");
  if (c.not_started) return fail("This coupon is not active yet");
  if (c.expired) return fail("This coupon has expired");
  if (c.used_up) return fail("This coupon has reached its usage limit");
  if (subtotalCents < c.min_cents) return fail(`Minimum order of ${formatEUR(c.min_cents)} required`);
  const discountCents =
    c.discount_type === "PERCENT"
      ? Math.round((subtotalCents * c.value_cents) / 10000)
      : Math.min(c.value_cents, subtotalCents);
  const label = c.discount_type === "PERCENT" ? `${c.value_cents / 100}% off` : `${formatEUR(c.value_cents)} off`;
  return { code: c.code, valid: true, message: `${c.code} applied: ${label}`, discountCents, couponId: c.id };
}

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  image_key: string;
  colors: string;
  sizes: string;
  price_cents: number;
  available: number;
};

export async function quoteCart(items: CartItemInput[], couponCode?: string | null, q: Db = db): Promise<Quote> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await q.query<ProductRow>(
    `SELECT p.id, p.slug, p.name, p.image_key, p.colors, p.sizes,
            (p.price * 100)::int AS price_cents, (i.quantity - i.reserved) AS available
     FROM shop.products p JOIN shop.inventory i ON i.product_id = p.id
     WHERE p.is_active AND p.id = ANY(CAST(string_to_array(CAST(:ids AS text), ',') AS int[]))`,
    { ids: ids.join(",") },
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const qtyByProduct = new Map<number, number>();
  for (const i of items) qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.quantity);

  const lines: PricedLine[] = items.map((i) => {
    const p = byId.get(i.productId);
    if (!p)
      return { ...i, slug: "", name: "Unavailable product", imageKey: "", unitCents: 0, lineCents: 0, available: 0, error: "This product is no longer available" };
    const line: PricedLine = {
      ...i,
      slug: p.slug,
      name: p.name,
      imageKey: p.image_key,
      unitCents: p.price_cents,
      lineCents: p.price_cents * i.quantity,
      available: p.available,
    };
    if (!splitList(p.sizes).includes(i.size)) line.error = "Please choose a valid size";
    else if (!splitList(p.colors).includes(i.color)) line.error = "Please choose a valid colour";
    else if (p.available <= 0) line.error = "Out of stock";
    else if ((qtyByProduct.get(i.productId) ?? 0) > p.available) line.error = `Only ${p.available} left in stock`;
    return line;
  });

  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  let coupon: Quote["coupon"] = null;
  let discountCents = 0;
  if (couponCode && couponCode.trim()) {
    const c = await evaluateCoupon(q, couponCode, subtotalCents);
    coupon = { code: c.code, valid: c.valid, message: c.message, couponId: "couponId" in c ? c.couponId : undefined };
    discountCents = c.discountCents;
  }
  const afterDiscount = subtotalCents - discountCents;
  const shippingCents = afterDiscount >= FREE_SHIPPING_THRESHOLD_CENTS || afterDiscount === 0 ? 0 : SHIPPING_FEE_CENTS;
  return {
    lines,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: afterDiscount + shippingCents,
    coupon,
    valid: lines.every((l) => !l.error) && (!coupon || coupon.valid),
  };
}

// ------------------------------------------------------------- fake payments

/** Test cards (any future expiry, any 3-digit CVC). Every other Luhn-valid number succeeds. */
export const TEST_CARDS: Record<string, { outcome: string; message: string }> = {
  "4242424242424242": { outcome: "success", message: "Payment succeeds" },
  "5555555555554444": { outcome: "success", message: "Payment succeeds (Mastercard)" },
  "4000000000000002": { outcome: "card_declined", message: "Your card was declined." },
  "4000000000009995": { outcome: "insufficient_funds", message: "Your card has insufficient funds." },
  "4000000000000069": { outcome: "expired_card", message: "Your card has expired." },
  "4000000000000119": { outcome: "processing_error", message: "An error occurred while processing your card. Try again." },
};

function luhnValid(num: string) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = Number(num[num.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function cardBrand(num: string) {
  if (/^4/.test(num)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(num)) return "MASTERCARD";
  if (/^3[47]/.test(num)) return "AMEX";
  return "CARD";
}

export type PaymentInput = { cardNumber: string; expiry: string; cvc: string; nameOnCard: string };

export function validatePayment(raw: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const number = String(raw.cardNumber ?? "").replace(/[\s-]/g, "");
  const expiry = String(raw.expiry ?? "").trim();
  const cvc = String(raw.cvc ?? "").trim();
  const name = String(raw.nameOnCard ?? "").trim();
  if (!/^\d{13,19}$/.test(number) || !luhnValid(number)) errors.cardNumber = "Enter a valid card number";
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) errors.expiry = "Use MM/YY";
  else {
    const now = new Date();
    const expEnd = new Date(Date.UTC(2000 + Number(m[2]), Number(m[1]), 1));
    if (expEnd <= now) errors.expiry = "Card expiry is in the past";
  }
  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = "Enter the 3 or 4 digit CVC";
  if (!name) errors.nameOnCard = "Name on card is required";
  return { errors, number, brand: cardBrand(number), last4: number.slice(-4) };
}

function simulateCharge(number: string) {
  const t = TEST_CARDS[number];
  if (!t || t.outcome === "success") return { ok: true as const };
  return { ok: false as const, reason: t.outcome, message: t.message };
}

// ------------------------------------------------------------ shipping input

export type ShippingInput = { fullName: string; street: string; city: string; postalCode: string; country: string };

const POSTAL_RULES: Record<string, RegExp> = { DE: /^\d{5}$/, AT: /^\d{4}$/, NL: /^\d{4}\s?[A-Za-z]{2}$/, BE: /^\d{4}$/ };

export function validateShipping(raw: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const v: ShippingInput = {
    fullName: String(raw.fullName ?? "").trim(),
    street: String(raw.street ?? "").trim(),
    city: String(raw.city ?? "").trim(),
    postalCode: String(raw.postalCode ?? "").trim(),
    country: String(raw.country ?? "").trim().toUpperCase(),
  };
  if (!v.fullName) errors.fullName = "Full name is required";
  if (!v.street) errors.street = "Street and house number are required";
  if (!v.city) errors.city = "City is required";
  if (!COUNTRIES[v.country]) errors.country = "We don't ship to this country yet";
  if (!v.postalCode) errors.postalCode = "Postal code is required";
  else if (POSTAL_RULES[v.country] && !POSTAL_RULES[v.country].test(v.postalCode))
    errors.postalCode = `Invalid postal code for ${COUNTRIES[v.country]}`;
  return { errors, value: v };
}

// -------------------------------------------------------------- place order

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `IS-${ymd}-${rand}`;
}

const cents = (c: number) => (c / 100).toFixed(2);

export type PlaceOrderInput = {
  items: CartItemInput[];
  couponCode?: string | null;
  customerId: number | null;
  email: string;
  shipping: ShippingInput;
  payment: { number: string; brand: string; last4: string };
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; accessToken: string; totalCents: number }
  | { ok: false; orderNumber: string; reason: string; message: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return transaction(async (tx) => {
    const quote = await quoteCart(input.items, input.couponCode, tx);
    if (!quote.valid) {
      const problems = quote.lines.filter((l) => l.error).map((l) => ({ productId: l.productId, name: l.name, error: l.error }));
      if (quote.coupon && !quote.coupon.valid)
        throw new CheckoutError(quote.coupon.message, 422, "INVALID_COUPON", { coupon: quote.coupon });
      throw new CheckoutError("Some items in your cart need attention", 409, "CART_INVALID", { lines: problems });
    }

    const number = orderNumber();
    const token = randomBytes(16).toString("hex");
    const [order] = await tx.query<{ id: number }>(
      `INSERT INTO shop.orders (order_number, access_token, customer_id, guest_email,
                                ship_name, ship_street, ship_city, ship_postal_code, ship_country,
                                coupon_id, status, subtotal, discount, shipping_fee, total)
       VALUES (:number, :token, :customerId, :guestEmail, :name, :street, :city, :postal, :country,
               :couponId, 'PENDING', CAST(:subtotal AS numeric), CAST(:discount AS numeric), CAST(:shipping AS numeric), CAST(:total AS numeric))
       RETURNING id`,
      {
        number,
        token,
        customerId: input.customerId,
        guestEmail: input.customerId ? null : input.email,
        name: input.shipping.fullName,
        street: input.shipping.street,
        city: input.shipping.city,
        postal: input.shipping.postalCode,
        country: input.shipping.country,
        couponId: quote.coupon?.valid ? (quote.coupon.couponId ?? null) : null,
        subtotal: cents(quote.subtotalCents),
        discount: cents(quote.discountCents),
        shipping: cents(quote.shippingCents),
        total: cents(quote.totalCents),
      },
    );

    for (const l of quote.lines) {
      await tx.query(
        `INSERT INTO shop.order_items (order_id, product_id, product_name, size, color, quantity, unit_price)
         VALUES (:orderId, :productId, :name, :size, :color, :qty, CAST(:unit AS numeric))`,
        { orderId: order.id, productId: l.productId, name: l.name, size: l.size, color: l.color, qty: l.quantity, unit: cents(l.unitCents) },
      );
    }

    const charge = simulateCharge(input.payment.number);
    const providerRef = `PSP-${randomBytes(6).toString("hex")}`;

    if (!charge.ok) {
      // Keep the declined attempt for auditing/testing, but don't touch stock.
      await tx.query(
        `INSERT INTO shop.payments (order_id, method, status, amount, card_brand, card_last4, failure_reason, provider_ref)
         VALUES (:orderId, 'CARD', 'FAILED', CAST(:amount AS numeric), :brand, :last4, :reason, :ref)`,
        { orderId: order.id, amount: cents(quote.totalCents), brand: input.payment.brand, last4: input.payment.last4, reason: charge.reason, ref: providerRef },
      );
      await tx.query(`UPDATE shop.orders SET status = 'CANCELLED', updated_at = now() WHERE id = :id`, { id: order.id });
      return { ok: false, orderNumber: number, reason: charge.reason, message: charge.message };
    }

    const qtyByProduct = new Map<number, number>();
    for (const l of quote.lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
    for (const [productId, qty] of qtyByProduct) {
      const updated = await tx.query(
        `UPDATE shop.inventory SET quantity = quantity - :qty
         WHERE product_id = :productId AND quantity - reserved >= :qty RETURNING product_id`,
        { qty, productId },
      );
      if (!updated.length) throw new CheckoutError("An item sold out while you were checking out", 409, "OUT_OF_STOCK", { productId });
    }

    await tx.query(
      `INSERT INTO shop.payments (order_id, method, status, amount, card_brand, card_last4, provider_ref)
       VALUES (:orderId, 'CARD', 'CAPTURED', CAST(:amount AS numeric), :brand, :last4, :ref)`,
      { orderId: order.id, amount: cents(quote.totalCents), brand: input.payment.brand, last4: input.payment.last4, ref: providerRef },
    );
    await tx.query(`UPDATE shop.orders SET status = 'PAID', updated_at = now() WHERE id = :id`, { id: order.id });
    if (quote.coupon?.valid && quote.coupon.couponId)
      await tx.query(`UPDATE shop.coupons SET times_used = times_used + 1 WHERE id = :id`, { id: quote.coupon.couponId });

    return { ok: true, orderNumber: number, accessToken: token, totalCents: quote.totalCents };
  });
}

// ----------------------------------------------------------------- reading

export type OrderView = {
  id: number;
  order_number: string;
  status: string;
  customer_id: number | null;
  email: string;
  ship_name: string | null;
  ship_street: string | null;
  ship_city: string | null;
  ship_postal_code: string | null;
  ship_country: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  coupon_code: string | null;
  created_at: string;
  payment_status: string | null;
  card_brand: string | null;
  card_last4: string | null;
  items: { product_id: number; product_name: string; slug: string; image_key: string; size: string; color: string; quantity: number; unit_cents: number }[];
};

/** Returns the order only if the caller owns it (session) or knows its access token (guest link). */
export async function getOrderForViewer(orderNo: string, viewer: { customerId?: number | null; token?: string | null }) {
  const rows = await db.query<Omit<OrderView, "items"> & { access_token: string }>(
    `SELECT o.id, o.order_number, o.status::text AS status, o.customer_id, o.access_token,
            COALESCE(cu.email, o.guest_email) AS email,
            o.ship_name, o.ship_street, o.ship_city, o.ship_postal_code, o.ship_country,
            (o.subtotal * 100)::int AS subtotal_cents, (o.discount * 100)::int AS discount_cents,
            (o.shipping_fee * 100)::int AS shipping_cents, (o.total * 100)::int AS total_cents,
            cp.code AS coupon_code,
            to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            pay.status::text AS payment_status, pay.card_brand, pay.card_last4
     FROM shop.orders o
     LEFT JOIN shop.customers cu ON cu.id = o.customer_id
     LEFT JOIN shop.coupons cp ON cp.id = o.coupon_id
     LEFT JOIN LATERAL (SELECT status, card_brand, card_last4 FROM shop.payments
                        WHERE order_id = o.id ORDER BY created_at DESC, id DESC LIMIT 1) pay ON TRUE
     WHERE o.order_number = :no`,
    { no: orderNo },
  );
  const o = rows[0];
  if (!o) return null;
  const allowed = (viewer.customerId && o.customer_id === viewer.customerId) || (viewer.token && viewer.token === o.access_token);
  if (!allowed) return null;
  const items = await db.query<OrderView["items"][number]>(
    `SELECT oi.product_id, oi.product_name, p.slug, p.image_key, oi.size, oi.color, oi.quantity,
            (oi.unit_price * 100)::int AS unit_cents
     FROM shop.order_items oi JOIN shop.products p ON p.id = oi.product_id
     WHERE oi.order_id = :id ORDER BY oi.id`,
    { id: o.id },
  );
  const { access_token: _omit, ...rest } = o;
  void _omit;
  return { ...rest, items } as OrderView;
}

export async function listCustomerOrders(customerId: number) {
  return db.query<{ order_number: string; status: string; total_cents: number; item_count: number; created_at: string }>(
    `SELECT o.order_number, o.status::text AS status, (o.total * 100)::int AS total_cents,
            COALESCE(sum(oi.quantity), 0)::int AS item_count,
            to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS created_at
     FROM shop.orders o LEFT JOIN shop.order_items oi ON oi.order_id = o.id
     WHERE o.customer_id = :id
     GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`,
    { id: customerId },
  );
}

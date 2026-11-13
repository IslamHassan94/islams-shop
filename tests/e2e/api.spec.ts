import { expect, test } from "@playwright/test";

test("health endpoint reports db up", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok", db: "up" });
});

test("orders API rejects a declined card with 402", async ({ request }) => {
  const res = await request.post("/api/orders", {
    data: {
      items: [{ productId: 34, size: "One Size", color: "Black", quantity: 1 }],
      email: "api@example.test",
      shipping: { fullName: "API", street: "Weg 1", city: "Wetzlar", postalCode: "35578", country: "DE" },
      payment: { cardNumber: "4000000000009995", expiry: "12/29", cvc: "123", nameOnCard: "API" },
    },
  });
  expect(res.status()).toBe(402);
  expect(await res.json()).toMatchObject({ code: "PAYMENT_FAILED", reason: "insufficient_funds" });
});

test("guest order is not visible without its access token", async ({ request }) => {
  const res = await request.get("/api/orders/IS-GUEST-001");
  expect(res.status()).toBe(404);
});

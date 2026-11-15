import { expect, test } from "@playwright/test";
import { amountToFreeShippingCents, discountForSubtotal } from "../../lib/catalog-meta";
import { addToCart } from "./helpers";

const pct = (p: number) => ({ type: "PERCENT" as const, valueCents: p * 100 });
const fixed = (eur: number) => ({ type: "FIXED" as const, valueCents: eur * 100 });

test.describe("amountToFreeShippingCents (unit)", () => {
  test("no coupon: plain gap to €75", () => {
    expect(amountToFreeShippingCents(5800, null)).toBe(1700);
  });

  test("10% coupon: accounts for the discount on the added items", () => {
    // Regression: the old hint said €22.80, which only reached €72.72 after discount.
    const extra = amountToFreeShippingCents(5800, pct(10))!;
    expect(extra).toBe(2533);
    const net = (s: number) => s - discountForSubtotal(pct(10), s);
    expect(net(5800 + extra)).toBeGreaterThanOrEqual(7500);
    expect(net(5800 + extra - 1)).toBeLessThan(7500);
  });

  test("fixed €20 coupon: gap plus the fixed discount", () => {
    expect(amountToFreeShippingCents(10000, fixed(20))).toBe(0);
    expect(amountToFreeShippingCents(6000, fixed(20))).toBe(3500);
  });

  test("already free returns 0, unreachable returns null", () => {
    expect(amountToFreeShippingCents(9000, pct(10))).toBe(0);
    expect(amountToFreeShippingCents(5000, pct(100))).toBeNull();
  });
});

test("cart hint with WELCOME10 shows the amount that really unlocks free shipping", async ({ page }) => {
  await addToCart(page, "sculpt-seamless-leggings", "M");
  await page.goto("/cart");
  await expect(page).toHaveTitle("Cart · Islam's Shop");
  await expect(page.getByTestId("free-shipping-hint")).toContainText("17,00");

  await page.getByTestId("coupon-input").fill("WELCOME10");
  await page.getByTestId("apply-coupon").click();
  await expect(page.getByTestId("coupon-message")).toContainText("10% off");
  await expect(page.getByTestId("free-shipping-hint")).toContainText("25,33");
});

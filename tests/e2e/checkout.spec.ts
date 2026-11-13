import { expect, test } from "@playwright/test";
import { TEST_CARD_DECLINED, TEST_CARD_OK, addToCart, fillCard, fillShipping } from "./helpers";

test("guest can buy with a valid card and coupon", async ({ page }) => {
  await addToCart(page, "aeroflex-high-rise-leggings", "M", "navy");
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.goto("/cart");
  await page.getByTestId("coupon-input").fill("WELCOME10");
  await page.getByTestId("apply-coupon").click();
  await expect(page.getByTestId("coupon-message")).toContainText("10% off");
  await expect(page.getByTestId("summary-discount")).toBeVisible();

  await page.getByTestId("checkout-button").click();
  await page.getByTestId("checkout-email").fill(`guest+${Date.now()}@example.test`);
  await fillShipping(page);
  await fillCard(page, TEST_CARD_OK);
  await page.getByTestId("place-order").click();

  await expect(page).toHaveURL(/\/order\/IS-/);
  await expect(page.getByTestId("order-success")).toBeVisible();
  await expect(page.getByTestId("order-status")).toHaveText("PAID");
  await expect(page.getByTestId("cart-count")).toHaveText("0");
});

test("declined card shows an error and keeps the cart", async ({ page }) => {
  await addToCart(page, "core-support-sports-bra", "S");
  await page.goto("/checkout");
  await page.getByTestId("checkout-email").fill("decline@example.test");
  await fillShipping(page);
  await fillCard(page, TEST_CARD_DECLINED);
  await page.getByTestId("place-order").click();
  await expect(page.getByTestId("checkout-error")).toHaveText("Your card was declined.");
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("checkout validates required fields", async ({ page }) => {
  await addToCart(page, "performance-cap", "one size");
  await page.goto("/checkout");
  await page.getByTestId("place-order").click();
  await expect(page.getByTestId("error-email")).toBeVisible();
  await expect(page.getByTestId("error-shipping-fullName")).toBeVisible();
  await expect(page.getByTestId("error-payment-cardNumber")).toBeVisible();
});

test("expired coupon is rejected", async ({ page }) => {
  await addToCart(page, "performance-cap", "one size");
  await page.goto("/cart");
  await page.getByTestId("coupon-input").fill("EXPIRED50");
  await page.getByTestId("apply-coupon").click();
  await expect(page.getByTestId("coupon-message")).toContainText("expired");
  await expect(page.getByTestId("checkout-button")).toHaveAttribute("aria-disabled", "true");
});

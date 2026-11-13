import { expect, type Page } from "@playwright/test";

export const TEST_CARD_OK = "4242 4242 4242 4242";
export const TEST_CARD_DECLINED = "4000 0000 0000 0002";

export async function addToCart(page: Page, slug: string, size: string, color?: string) {
  await page.goto(`/product/${slug}`);
  if (color) await page.getByTestId(`color-${color}`).click();
  await page.getByTestId(`size-${size.toLowerCase()}`).click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("added-to-cart-message")).toBeVisible();
}

export async function fillShipping(page: Page) {
  await page.getByTestId("shipping-fullName").fill("Islam Tester");
  await page.getByTestId("shipping-street").fill("Hauptstraße 1");
  await page.getByTestId("shipping-postalCode").fill("35578");
  await page.getByTestId("shipping-city").fill("Wetzlar");
  await page.getByTestId("shipping-country").selectOption("DE");
}

export async function fillCard(page: Page, number: string) {
  await page.getByTestId("payment-cardNumber").fill(number);
  await page.getByTestId("payment-expiry").fill("12/29");
  await page.getByTestId("payment-cvc").fill("123");
  await page.getByTestId("payment-nameOnCard").fill("Islam Tester");
}

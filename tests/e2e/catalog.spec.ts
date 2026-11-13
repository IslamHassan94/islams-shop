import { expect, test } from "@playwright/test";

test("home page shows hero, categories and bestsellers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero")).toBeVisible();
  await expect(page.getByTestId("category-grid").getByRole("link")).toHaveCount(7);
  await expect(page.getByTestId("bestsellers").getByTestId("product-card")).toHaveCount(8);
});

test("search finds hoodies", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("search-input").fill("hoodie");
  await page.getByTestId("search-input").press("Enter");
  await expect(page.getByTestId("shop-title")).toContainText("hoodie");
  const names = await page.getByTestId("product-name").allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n.toLowerCase()).toMatch(/hoodie|jacket|top/);
});

test("sort by price ascending orders products", async ({ page }) => {
  await page.goto("/shop?category=leggings");
  await page.getByTestId("sort-select").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  const prices = (await page.getByTestId("product-grid").getByTestId("price").allTextContents()).map((t) =>
    Number(t.replace(/[^\d,]/g, "").replace(",", ".")),
  );
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});

test("out-of-stock product cannot be added", async ({ page }) => {
  await page.goto("/product/neon-pulse-leggings-limited");
  await expect(page.getByTestId("add-to-cart")).toBeDisabled();
  await expect(page.getByTestId("stock-status")).toHaveText(/out of stock/i);
});

test("inactive product returns 404", async ({ page }) => {
  const res = await page.goto("/product/retired-classic-tank");
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId("not-found")).toBeVisible();
});

test("size is required before adding to cart", async ({ page }) => {
  await page.goto("/product/aeroflex-high-rise-leggings");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("add-to-cart-error")).toHaveText("Please select a size");
  await expect(page.getByTestId("cart-count")).toHaveText("0");
});

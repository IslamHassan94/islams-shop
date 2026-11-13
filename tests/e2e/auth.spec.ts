import { expect, test } from "@playwright/test";

test("demo user can log in and see order history", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("demo@islamsshop.test");
  await page.getByTestId("login-password").fill("Test@1234");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByTestId("account-email")).toContainText("demo@islamsshop.test");
  await expect(page.getByTestId("order-row").first()).toBeVisible();
});

test("blocked user is refused", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("blocked.user@islamsshop.test");
  await page.getByTestId("login-password").fill("Test@1234");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("login-error")).toContainText("blocked");
});

test("account page requires login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)account/);
});

test("new customer can register", async ({ page }) => {
  await page.goto("/register");
  await page.getByTestId("register-firstName").fill("Neo");
  await page.getByTestId("register-lastName").fill("Tester");
  await page.getByTestId("register-email").fill(`neo+${Date.now()}@example.test`);
  await page.getByTestId("register-password").fill("Passw0rd!");
  await page.getByTestId("register-submit").click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByTestId("no-orders")).toBeVisible();
});

import { test, expect } from "@playwright/test";

test.describe("Authentication E2E", () => {
  test("should register and login", async ({ page }) => {
    // Go to register page
    await page.goto("http://localhost:5173/auth/register");

    // Fill registration form
    await page.fill('input[name=name]', "E2E Test User");
    await page.fill('input[name=email]', "e2e@test.com");
    await page.fill('input[name=password]', "password123");

    // Submit form
    await page.click('button[type=submit]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL("**/dashboard");
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("http://localhost:5173/auth/login");

    // Fill login form
    await page.fill('input[name=email]', "test@example.com");
    await page.fill('input[name=password]', "password123");

    // Submit form
    await page.click('button[type=submit]');

    // Wait for redirect
    await page.waitForURL("**/dashboard");
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });
});

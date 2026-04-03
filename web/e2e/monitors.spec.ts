import { test, expect } from "@playwright/test";

test.describe("Monitors E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("http://localhost:5173/auth/login");
    await page.fill('input[name=email]', "test@example.com");
    await page.fill('input[name=password]', "password123");
    await page.click('button[type=submit]');
    await page.waitForURL("**/dashboard");
  });

  test("should create a new HTTP monitor", async ({ page }) => {
    await page.goto("http://localhost:5173/monitors/create");

    // Fill monitor form
    await page.fill('input[name=name]', "E2E Test Monitor");
    await page.fill('input[name=target]', "https://example.com");
    await page.selectOption('select[name=type]', "HTTP");

    // Submit form
    await page.click('button[type=submit]');

    // Wait for success message
    await expect(page.locator("text=创建成功")).toBeVisible();
  });

  test("should display monitor list", async ({ page }) => {
    await page.goto("http://localhost:5173/websites");

    // Check if table is visible
    await expect(page.locator("table")).toBeVisible();

    // Check if page header is visible
    await expect(page.locator("text=网站监控")).toBeVisible();
  });

  test("should view monitor details", async ({ page }) => {
    await page.goto("http://localhost:5173/websites");

    // Click on first monitor
    await page.click("table tbody tr:first-child td a");

    // Wait for detail page
    await expect(page.locator("text=网站监控详情")).toBeVisible();
  });
});

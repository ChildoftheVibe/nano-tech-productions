import { test, expect } from "@playwright/test";

test.describe("admin access control", () => {
  test("/admin redirects to login page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("/admin/artists redirects to login page", async ({ page }) => {
    await page.goto("/admin/artists");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("/admin/tracks redirects to login page", async ({ page }) => {
    await page.goto("/admin/tracks");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong password shows an error message", async ({ page }) => {
    await page.goto("/admin/login");

    // The login page has a single password input (no username)
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    await passwordInput.fill("definitely-wrong-password-12345");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Error paragraph appears after the failed request
    const errorMsg = page.locator("p").filter({ hasText: /invalid password|too many/i });
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });
  });

  test("login form is present with password field and submit button", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("purchase flow", () => {
  test("buy modal opens, shows price, and closes cleanly", async ({ page }) => {
    await page.goto("/");

    // Navigate to the first album
    const albumLink = page.getByRole("link").filter({ hasText: /album|nano|art/i }).first();
    await albumLink.click();
    await page.waitForURL(/\/album\//);

    // Click the first buy button (aria-label: "Buy <title> for $<price>")
    const buyBtn = page.getByRole("button", { name: /^Buy .+ for \$\d/ }).first();
    await buyBtn.click();

    // Modal should be open
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Price should be visible inside the modal
    await expect(modal.getByText(/\$\d+\.\d{2}/)).toBeVisible();

    // PayPal area: either loading spinner or buttons
    const paypalArea = modal.locator('[role="status"], .paypal-buttons, iframe[title*="PayPal"]');
    await expect(paypalArea.first()).toBeVisible({ timeout: 15_000 });

    // Close with Escape key
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("modal closes via close button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link").filter({ hasText: /album|nano|art/i }).first().click();
    await page.waitForURL(/\/album\//);

    await page.getByRole("button", { name: /^Buy .+ for \$\d/ }).first().click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Close button — the X icon button in the modal header
    await modal.getByRole("button").filter({ hasText: "" }).first().click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});

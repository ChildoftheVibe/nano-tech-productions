import { test, expect } from "@playwright/test";

test.describe("player bar persistence", () => {
  test("player bar is present on the home page", async ({ page }) => {
    await page.goto("/");
    // PlayerBar has aria-label="Music player"
    await expect(page.getByLabel("Music player")).toBeVisible();
  });

  test("player bar is present on /library", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByLabel("Music player")).toBeVisible();
  });

  test("player bar survives client-side navigation home → library → home", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByLabel("Music player")).toBeVisible();

    // Navigate to library via the sidebar/tab link
    await page.getByRole("link", { name: /library/i }).first().click();
    await page.waitForURL(/\/library/);
    await expect(page.getByLabel("Music player")).toBeVisible();

    // Navigate back home
    await page.getByRole("link", { name: /home|ntv|vault/i }).first().click();
    await page.waitForURL(/\/$/);
    await expect(page.getByLabel("Music player")).toBeVisible();
  });

  test("player bar play button is accessible", async ({ page }) => {
    await page.goto("/");
    const playerBar = page.getByLabel("Music player");
    await expect(playerBar).toBeVisible();
    // At least one play/pause button should exist in the player
    const playBtn = playerBar.getByRole("button", { name: /play|pause/i }).first();
    await expect(playBtn).toBeVisible();
  });
});

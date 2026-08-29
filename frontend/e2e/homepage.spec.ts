import { test, expect } from "@playwright/test";

// The hero copy itself is admin-editable (HomeHeroSettings/HomeHeroSlide,
// see CLAUDE.md's SitePage/hero-editor notes), so this deliberately doesn't
// assert on any specific wording -- only on the stable metadata title and
// structural nav elements that don't change with site-admin edits.
test.describe("homepage", () => {
  test("loads with the expected title and a login link in the nav", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GoodTribes\.org/);
    // href$= (suffix match), not an exact match: content negotiation serves
    // "/en/login" instead of "/login" here when the browser's locale isn't
    // Swedish (e.g. Playwright's default en-US), same route either way.
    await expect(page.locator('a[href$="/login"]')).toBeVisible();
  });

  test("the English locale renders too", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/GoodTribes\.org/);
  });
});

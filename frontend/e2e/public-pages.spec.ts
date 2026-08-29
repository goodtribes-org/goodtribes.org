import { test, expect } from "@playwright/test";

// One test per public list page. These are exactly the pages Fas 1 of the
// architecture memo's scalability work added caching to (unstable_cache,
// see CLAUDE.md) -- a real page-load smoke test here covers "does the
// cached path still actually render," not just "does the route exist."
for (const path of ["/projects", "/members", "/ideas"]) {
  test(`${path} renders without a server error`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(/Application error|Internal Server Error/i)).toHaveCount(0);
  });
}

test("search page renders a search input", async ({ page }) => {
  await page.goto("/search");
  await expect(page.locator("input").first()).toBeVisible();
});

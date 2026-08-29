import { test, expect } from "@playwright/test";

// Deliberately doesn't submit the form -- that would call the real
// signIn("resend", ...) and needs a working RESEND_API_KEY plus actual email
// delivery, neither of which belongs in a CI smoke test. What this DOES
// catch: the exact regression class documented in
// frontend/.claude/skills/run-goodtribes-org/SKILL.md's gotchas -- "/login
// redirects to / when AUTH_SECRET is blank." Asserting the form actually
// renders on /login (not a silent redirect to /) is a real, cheap check for
// that misconfiguration.
test("login page renders the magic-link form, not a redirect to home", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

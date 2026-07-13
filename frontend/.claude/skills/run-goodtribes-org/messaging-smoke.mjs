import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const A = JSON.parse(process.env.USER_A);
const B = JSON.parse(process.env.USER_B);
const OUT = "/tmp/shots-messaging";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

function withSession(token) {
  return browser.newContext().then(async (ctx) => {
    await ctx.addCookies([
      {
        name: "authjs.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    return ctx;
  });
}

const ctxA = await withSession(A.sessionToken);
const ctxB = await withSession(B.sessionToken);
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();
pageA.setDefaultTimeout(15000);
pageB.setDefaultTimeout(15000);

const results = {};

// 1. User A opens User B's profile, sends a message via MessageButton
await pageA.goto(`${BASE}/members/${B.id}`, { waitUntil: "domcontentloaded" });
await pageA.waitForTimeout(500);
await pageA.screenshot({ path: `${OUT}/1-profile-a-view.png` });
const cta = pageA.getByRole("button", { name: /Message|Meddelande/i }).first();
results.ctaVisible = await cta.isVisible();
await cta.click();
await pageA.waitForTimeout(300);
const textarea = pageA.locator("textarea").first();
await textarea.fill("Hej! Detta ar ett automatiserat testmeddelande.");
await pageA.screenshot({ path: `${OUT}/2-compose.png` });
const sendBtn = pageA.getByRole("button", { name: /^(Send|Skicka)$/i }).first();
await sendBtn.click();
await pageA.waitForURL(/\/messages\//, { timeout: 10000 });
results.redirectedToConversation = pageA.url();
await pageA.screenshot({ path: `${OUT}/3-thread-a.png` });

// 2. User B checks the Messages nav icon shows unread, then opens inbox
await pageB.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await pageB.waitForTimeout(1200); // allow unread-count poll
await pageB.screenshot({ path: `${OUT}/4-nav-b-unread.png` });
const navBadge = pageB.locator("a[href$='/messages'] span").first();
results.navBadgeText = (await navBadge.isVisible().catch(() => false)) ? await navBadge.textContent() : null;

await pageB.goto(`${BASE}/messages`, { waitUntil: "domcontentloaded" });
await pageB.waitForTimeout(500);
await pageB.screenshot({ path: `${OUT}/5-inbox-b.png` });
results.inboxHasRow = await pageB.getByText("Test Sender A").first().isVisible().catch(() => false);

await pageB.getByText("Test Sender A").first().click();
await pageB.waitForURL(/\/messages\//, { timeout: 10000 });
await pageB.waitForTimeout(500);
results.messageVisibleToB = await pageB.getByText("automatiserat testmeddelande").first().isVisible().catch(() => false);
await pageB.screenshot({ path: `${OUT}/6-thread-b.png` });

// 3. Reply from B, confirm SSE delivers it live to A's open thread
const replyTextarea = pageB.locator(".ProseMirror").first();
await replyTextarea.click();
await replyTextarea.fill("Svar via SSE-test.");
await pageB.getByRole("button", { name: /^(Send|Skicka)$/i }).first().click();
await pageA.waitForTimeout(2500); // SSE poll interval is 1.5s
results.sseDeliveredReplyToA = await pageA.getByText("Svar via SSE-test").first().isVisible().catch(() => false);
await pageA.screenshot({ path: `${OUT}/7-thread-a-after-sse.png` });

// 4. Cleanup route checks
const kanbanResp = await pageA.goto(`${BASE}/projects/goodtribes/kanban`, { waitUntil: "domcontentloaded" });
results.kanbanFinalUrl = pageA.url();
results.kanbanStatus = kanbanResp?.status();

const milestonesResp = await pageA.goto(`${BASE}/projects/goodtribes/milestones`, { waitUntil: "domcontentloaded" });
results.milestonesStatus = milestonesResp?.status();
await pageA.screenshot({ path: `${OUT}/8-milestones-404.png` });

await browser.close();
console.log(JSON.stringify(results, null, 2));

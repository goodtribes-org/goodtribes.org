import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots-kanban";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(15000);

await page.goto(`${BASE}/projects/goodtribes/tasks`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/kanban.png`, fullPage: false });

const addBtn = page.locator("button").filter({ hasText: "+" }).first();
if (await addBtn.isVisible()) {
  await addBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/kanban-modal.png`, fullPage: false });
}

await browser.close();
console.log("Done:", OUT);

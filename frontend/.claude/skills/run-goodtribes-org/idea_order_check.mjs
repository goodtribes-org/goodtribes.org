import { chromium } from "playwright";

const base = "http://localhost:3010";
const slug = "test";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("response", (res) => { if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`); });

await page.goto(`${base}/sv/projects/${slug}`, { waitUntil: "load", timeout: 60000 });
const btn = page.locator("nav button", { hasText: "IDÉ" });
await btn.first().click();
await page.waitForTimeout(200);
const rows = await page.locator("div.absolute .flex.items-center.gap-2\\.5").allTextContents();
console.log("Idé checklist rows (numbering + label):");
rows.forEach((r) => console.log(" -", r.trim().replace(/\s+/g, " ")));

console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();

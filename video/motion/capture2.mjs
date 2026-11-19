import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
await p.goto("https://opvora-guardian.pages.dev", { waitUntil: "networkidle" });
await p.locator("#console").scrollIntoViewIfNeeded();
await p.click("#sim-toggle");
await p.waitForTimeout(26000);
await p.click("#sim-toggle"); // pause
const items = p.locator("#feed li");
const n = await items.count();
for (let i = n - 1; i >= 0; i--) { if ((await items.nth(i).innerText()).includes("CRITICAL")) { await items.nth(i).click(); break; } }
await p.waitForTimeout(1500);
await p.locator("#console").screenshot({ path: "shots/console2.png" });
await b.close();

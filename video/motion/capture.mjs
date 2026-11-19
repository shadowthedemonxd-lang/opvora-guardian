import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
await p.goto("https://opvora-guardian.pages.dev", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.screenshot({ path: "shots/hero.png" });
// console: run the simulation for a while
await p.locator("#console").scrollIntoViewIfNeeded();
await p.click("#sim-toggle");
await p.waitForTimeout(9000);
await p.locator("#feed li").first().click().catch(() => {});
await p.waitForTimeout(1500);
await p.locator("#console").screenshot({ path: "shots/console.png" });
// scanner: real AI analysis of a phishing link
await p.locator("#scanner").scrollIntoViewIfNeeded();
await p.fill("#scan-input", "http://paypa1-account-verify.com/login?session=locked&urgent=1");
await p.click("#scan-btn");
await p.waitForFunction(() => !document.querySelector("#scan-btn").disabled && document.querySelector("#scan-result").innerText.length > 120, null, { timeout: 40000 }).catch(e => console.log("scan wait", e.message));
await p.waitForTimeout(1200);
await p.locator("#scan-form").screenshot({ path: "shots/scan-form.png" });
await p.locator("#scan-result").screenshot({ path: "shots/scan-result.png" });
console.log("SCAN:", (await p.locator("#scan-result").innerText()).slice(0, 400));
// assistant
await p.click("#chat-open");
await p.waitForTimeout(800);
await p.locator("#chat-suggest button").nth(1).click();
await p.waitForTimeout(16000);
await p.locator("#chat").screenshot({ path: "shots/chat.png" });
console.log("CHAT:", (await p.locator("#chat-log").innerText()).slice(0, 300));
await b.close();

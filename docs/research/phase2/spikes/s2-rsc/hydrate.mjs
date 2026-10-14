import { chromium } from "playwright-core";
const browser = await chromium.launch();
const out = {};
for (const [path, trig] of [["/flat-a", "[data-nz-dialog-trigger]"], ["/ns-b", "[data-nz-sheet-trigger]"], ["/flat-b", "[data-nz-sheet-trigger]"], ["/client-ns", "[data-nz-dialog-trigger]"], ["/button-only", null]]) {
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(m.type() + ": " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 200)));
  await page.goto("http://localhost:3417" + path, { waitUntil: "networkidle" });
  const r = { consoleErrors: logs };
  if (trig) {
    const before = await page.locator(trig).first().getAttribute("aria-expanded");
    const popupsBefore = await page.locator('[role="dialog"]').count();
    await page.locator(trig).first().click();
    await page.waitForTimeout(150);
    r.ariaExpanded = { before, after: await page.locator(trig).first().getAttribute("aria-expanded") };
    r.popupCount = { before: popupsBefore, after: await page.locator('[role="dialog"]').count() };
  }
  out[path] = r;
  await page.close();
}
console.log(JSON.stringify(out, null, 2));
await browser.close();

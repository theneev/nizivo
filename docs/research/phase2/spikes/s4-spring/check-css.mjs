import { chromium, webkit } from "playwright-core";
import { readFileSync } from "node:fs";
const res = JSON.parse(readFileSync("spring-results.json", "utf8"));
const strs = [];
for (const [n, o] of Object.entries(res)) for (const [k, v] of Object.entries(o)) if (v && v.css) strs.push([n + " " + k, v.css]);
for (const eng of [chromium, webkit]) {
  const b = await eng.launch(); const p = await b.newPage();
  const r = await p.evaluate((strs) => strs.map(([k, s]) => [k, CSS.supports("transition-timing-function", s)]), strs);
  console.log(eng.name(), b.version(), r.every(([, ok]) => ok) ? "ALL " + r.length + " linear() strings valid" : JSON.stringify(r));
  await b.close();
}

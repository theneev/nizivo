import { transform } from "lightningcss";
import { chromium, webkit, firefox } from "playwright-core";
import { writeFileSync } from "node:fs";

const safari164 = { safari: (16 << 16) | (4 << 8) };
const tokens = `
  --nz-p-neutral-0: #ffffff; --nz-p-neutral-900: #181b19;
  --nz-bg-surface: light-dark(var(--nz-p-neutral-0), var(--nz-p-neutral-900));
`;
// Three root strategies
const rootVariants = {
  "root=light dark": `:root { ${tokens} color-scheme: light dark; }`,
  "root=unset": `:root { ${tokens} }`,
  "root=normal": `:root { ${tokens} color-scheme: normal; }`,
};
const scopes = `
[data-theme="dark"] { color-scheme: dark; }
[data-theme="light"] { color-scheme: light; }
[data-theme="normal"] { color-scheme: normal; }
.probe { background-color: var(--nz-bg-surface); }
.direct { background-color: light-dark(#ffffff, #181b19); }
`;
const registered = `@property --nz-bg-surface { syntax: "<color>"; inherits: true; initial-value: transparent; }\n`;

const body = `
<div class="probe" id="root"></div>
<div class="direct" id="direct-root"></div>
<div data-theme="dark"><div class="probe" id="d1"></div><div class="direct" id="direct-d1"></div>
  <div data-theme="light"><div class="probe" id="d1-l2"></div><div class="direct" id="direct-d1-l2"></div>
    <div data-theme="dark"><div class="probe" id="d1-l2-d3"></div></div>
  </div>
  <div data-theme="normal"><div class="probe" id="d1-normal"></div><div class="direct" id="direct-d1-normal"></div></div>
</div>`;
const ids = ["root", "direct-root", "d1", "direct-d1", "d1-l2", "direct-d1-l2", "d1-l2-d3", "d1-normal", "direct-d1-normal"];

const short = (c) => c === "rgb(255, 255, 255)" ? "L" : c === "rgb(24, 27, 25)" ? "D" : c === "rgba(0, 0, 0, 0)" ? "T" : c;

const cssVariants = {};
for (const [rk, rcss] of Object.entries(rootVariants)) {
  const src = rcss + scopes;
  cssVariants[`native | ${rk}`] = src;
  cssVariants[`lowered16.4 | ${rk}`] = transform({ filename: "x.css", code: Buffer.from(src), minify: false, targets: safari164 }).code.toString();
}
cssVariants["native+@property | root=light dark"] = registered + rootVariants["root=light dark"] + scopes;
writeFileSync("matrix-varinside-css-variants.json", JSON.stringify(cssVariants, null, 2));

const htmlAttrs = { "html:none": "", "html[data-theme=dark]": ' data-theme="dark"', "html[data-theme=light]": ' data-theme="light"' };
const engines = { chromium, webkit };
const rows = [];
for (const [ename, eng] of Object.entries(engines)) {
  let browser; try { browser = await eng.launch(); } catch (e) { console.error(`ENGINE  FAILED: ${e.message.split("\n")[0]}`); continue; }
  const version = browser.version();
  const page = await browser.newPage();
  for (const [vk, css] of Object.entries(cssVariants)) for (const [hk, hattr] of Object.entries(htmlAttrs)) for (const scheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setContent(`<!doctype html><html${hattr}><head><style>${css}</style></head><body>${body}</body></html>`);
    const vals = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, getComputedStyle(document.getElementById(id)).backgroundColor])), ids);
    rows.push({ engine: `${ename} ${version}`, css: vk, html: hk, os: scheme, ...Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, short(v)])) });
  }
  await browser.close();
}
writeFileSync("matrix-varinside-results.json", JSON.stringify(rows, null, 2));
// Print compact table
console.log(["engine", "css", "html", "os", ...ids].join(" | "));
for (const r of rows) console.log([r.engine, r.css, r.html, r.os, ...ids.map((i) => r[i])].join(" | "));

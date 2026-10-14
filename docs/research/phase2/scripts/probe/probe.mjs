import { chromium, webkit } from "playwright-core";
const css = `
:root { --nz-p-n0:#ffffff; --nz-p-n900:#181b19; --nz-p-g500:#2e8358; --nz-p-g300:#79b993;
  --nz-bg-surface: light-dark(var(--nz-p-n0), var(--nz-p-n900));
  --nz-border-focus: light-dark(var(--nz-p-g500), var(--nz-p-g300));
  --nz-focus-halo: color-mix(in oklab, var(--nz-border-focus) 28%, transparent);
  --nz-scheme-inverse: dark; }
[data-nz-theme="light"] { color-scheme: light; --nz-scheme-inverse: dark; }
[data-nz-theme="dark"] { color-scheme: dark; --nz-scheme-inverse: light; }
.inv { color-scheme: var(--nz-scheme-inverse); }
.bg { background-color: var(--nz-bg-surface); }
.halo { background-color: var(--nz-focus-halo); }
`;
const body = `<div data-nz-theme="light"><div id="l-bg" class="bg"></div><div id="l-halo" class="halo"></div><div class="inv"><div id="l-inv" class="bg"></div></div></div>
<div data-nz-theme="dark"><div id="d-bg" class="bg"></div><div id="d-halo" class="halo"></div><div class="inv"><div id="d-inv" class="bg"></div></div></div>
<div id="none-bg" class="bg"></div>`;
for (const eng of [chromium, webkit]) {
  const b = await eng.launch(); const p = await b.newPage();
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`);
  const r = await p.evaluate(() => {
    const g = (id) => getComputedStyle(document.getElementById(id)).backgroundColor;
    return { supportsMixLD: CSS.supports('color', 'color-mix(in oklab, light-dark(#fff, #000) 28%, transparent)'),
      lightBg: g('l-bg'), lightHalo: g('l-halo'), lightInverse: g('l-inv'),
      darkBg: g('d-bg'), darkHalo: g('d-halo'), darkInverse: g('d-inv'), noAttrUnderOsDark: g('none-bg') };
  });
  console.log(eng.name(), b.version(), JSON.stringify(r));
  await b.close();
}

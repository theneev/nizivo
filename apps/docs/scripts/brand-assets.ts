// The site's icons and share image, drawn from the sprout mark (components/site-mark.tsx; ASSETS.md,
// M90). Run by hand after the mark changes, and commit what it writes; the build only copies them
// (Next's icon files in app/, and public/):
//
//   node scripts/brand-assets.ts
//
// - app/icon.svg: the browser tab's icon, the mark in the light header's colours (bg/brand,
//   text/on-brand) and, under a dark OS theme, the dark header's;
// - app/favicon.ico: 16, 32 and 48 px PNGs for browsers and crawlers that ask for /favicon.ico;
// - app/apple-icon.png: 180 px, full bleed (iOS rounds the corners and fills transparency black);
// - public/og.png: 1200 × 630, the card a link to the site shows in chat apps and search (lib/seo.ts
//   names it on every page).
// Colours are the palette's hex values, since these files are read outside the site's CSS.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const require = createRequire(import.meta.url);
// geist exports no package.json; its font entry sits in dist/, beside the fonts
const FONTS = join(dirname(require.resolve('geist/font')), 'fonts');

/** The palette steps the mark uses (packages/tokens: green-700/400/950, neutral-0/50/700/900). */
const C = {
  brand: '#1a573a',
  brandDark: '#4c9e71',
  onBrandDark: '#0a211a',
  white: '#ffffff',
  canvas: '#f6f7f4',
  ink: '#181b19',
  inkSoft: '#414741',
} as const;

/** The sprout's three paths on a 32-unit grid, as in components/site-mark.tsx. */
function sprout(fill: string): string {
  return [
    `<path d="M16 25V15.5" stroke="${fill}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    `<path d="M16 16.5C16 11.8 19.4 8 24.5 8C24.5 12.7 20.9 16.5 16 16.5Z" fill="${fill}"/>`,
    `<path d="M16 19C16 15.4 13.2 12.5 9.2 12.5C9.2 16.1 12.1 19 16 19Z" fill="${fill}" opacity="0.72"/>`,
  ].join('');
}

/** The mark with rounded corners; `radius` 10 of 32 as in the header. */
function mark(background: string, ink: string, radius = 10): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="${radius}" fill="${background}"/>${sprout(ink)}</svg>`;
}

/** The tab icon: classes, so a dark OS theme swaps the colours as the site's dark header does. */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<style>.g{fill:${C.brand}}.s{fill:${C.white}}.l{stroke:${C.white}}@media (prefers-color-scheme:dark){.g{fill:${C.brandDark}}.s{fill:${C.onBrandDark}}.l{stroke:${C.onBrandDark}}}</style>
<rect class="g" width="32" height="32" rx="10"/>
<path class="l" d="M16 25V15.5" stroke-width="2" stroke-linecap="round" fill="none"/>
<path class="s" d="M16 16.5C16 11.8 19.4 8 24.5 8C24.5 12.7 20.9 16.5 16 16.5Z"/>
<path class="s" d="M16 19C16 15.4 13.2 12.5 9.2 12.5C9.2 16.1 12.1 19 16 19Z" opacity="0.72"/>
</svg>
`;

async function png(page: Page, html: string, width: number, height: number): Promise<Buffer> {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  return page.screenshot({ type: 'png', omitBackground: true });
}

/** An SVG at exactly `size` px, nothing around it. */
function square(svg: string, size: number): string {
  return `<!doctype html><style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;
}

/** An .ico holding PNG images (allowed since Windows Vista; every current browser reads it). */
function ico(images: readonly { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size % 256, at);
    header.writeUInt8(size % 256, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

function font(file: string): string {
  return `data:font/woff2;base64,${readFileSync(join(FONTS, file)).toString('base64')}`;
}

/** The share card: the mark, the name, the home page's headline and the two packages. */
function shareCard(): string {
  return `<!doctype html><style>
@font-face{font-family:Geist;font-weight:400;src:url(${font('geist-sans/Geist-Regular.woff2')})}
@font-face{font-family:Geist;font-weight:600;src:url(${font('geist-sans/Geist-SemiBold.woff2')})}
@font-face{font-family:GeistMono;font-weight:500;src:url(${font('geist-mono/GeistMono-Medium.woff2')})}
html,body{margin:0}
body{box-sizing:border-box;width:1200px;height:630px;padding:88px 96px;display:flex;flex-direction:column;
justify-content:space-between;font-family:Geist;color:${C.ink};
background:radial-gradient(60% 80% at 88% 18%,#d3e8da 0%,transparent 70%),
radial-gradient(50% 70% at 8% 100%,#e9f3ec 0%,transparent 70%),${C.canvas}}
.brand{display:flex;align-items:center;gap:24px;font-weight:600;font-size:40px;letter-spacing:-0.01em}
.brand svg{width:72px;height:72px}
h1{margin:0;font-weight:600;font-size:84px;line-height:1.02;letter-spacing:-0.03em;max-width:900px}
h1 span{color:${C.brand}}
p{margin:0;font-family:GeistMono;font-weight:500;font-size:26px;color:${C.inkSoft}}
</style>
<div class="brand">${mark(C.brand, C.white)}Nizivo UI</div>
<h1>Calm, accessible <span>product UI</span> for React</h1>
<p>@nizivo/react · @nizivo/tokens · nizivo.neevtechnologies.in</p>`;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  writeFileSync(join(APP, 'icon.svg'), ICON_SVG);
  const sizes = [16, 32, 48];
  const images: { size: number; data: Buffer }[] = [];
  for (const size of sizes) {
    // oxlint-disable-next-line no-await-in-loop -- one page, one size at a time
    images.push({ size, data: await png(page, square(mark(C.brand, C.white), size), size, size) });
  }
  writeFileSync(join(APP, 'favicon.ico'), ico(images));
  writeFileSync(
    join(APP, 'apple-icon.png'),
    await png(page, square(mark(C.brand, C.white, 0), 180), 180, 180),
  );
  writeFileSync(join(PUBLIC, 'og.png'), await png(page, shareCard(), 1200, 630));
  console.log('brand-assets: wrote app/icon.svg, favicon.ico, apple-icon.png and public/og.png');
} finally {
  await browser.close();
}

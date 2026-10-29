// The README's header pictures: the home page's hero, in light and in dark, from the built site.
// Run by hand after `pnpm --filter @nizivo/docs build` when the hero changes, and commit the two
// files it writes:
//
//   node scripts/readme-images.ts
//
// 1200 px wide, below the 80rem where the hero's floating cards (and their photos) appear, at 2x,
// with reduced motion so the Aurora shader draws its still frame. JPEG: the shader's grain makes a
// PNG about 4.5 MB. The hero's counts are the build's, so rerun this after a release.
/* oxlint-disable no-await-in-loop -- one scheme at a time, in one browser */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './serve.ts';

const OUT = fileURLToPath(new URL('../out/', import.meta.url));
const DEST = fileURLToPath(new URL('../../../docs/assets/', import.meta.url));

const server = await serve(OUT, 0);
const address = server.address();
const port = typeof address === 'object' && address !== null ? address.port : 0;
const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark'] as const) {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    // the hero from its top to just under the buttons: below them it keeps room for the floating
    // cards, empty at this width
    const box = await page.evaluate(() => {
      const hero = document.querySelector('.nz-home-hero')?.getBoundingClientRect();
      const actions = document
        .querySelector('.nz-home-hero .nz-home-actions')
        ?.getBoundingClientRect();
      return hero && actions
        ? { x: hero.x, y: hero.y, width: hero.width, height: actions.bottom - hero.y + 72 }
        : undefined;
    });
    if (box === undefined) throw new Error('readme-images: no hero on the home page');
    await page.screenshot({
      path: join(DEST, `readme-hero-${scheme}.jpg`),
      clip: box,
      type: 'jpeg',
      quality: 82,
    });
    await page.close();
  }
  console.log('readme-images: wrote docs/assets/readme-hero-light.jpg and readme-hero-dark.jpg');
} finally {
  await browser.close();
  server.close();
}

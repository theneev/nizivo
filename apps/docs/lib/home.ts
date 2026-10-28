// The home page's numbers, read from the repo at build time (M90), so the page never claims more
// than the packages ship: components from the catalogue, public tokens from the token contract,
// icons from the Icons page's index (brand glyphs left out), the contrast checks from @nizivo/tokens' CONTRAST.md, and the
// docs' own pages for foundations, charts and patterns.
import { readdirSync } from 'node:fs';
import { isRecord } from '../scripts/json';
import { catalog } from './catalog';
import { readRepoJson, readRepoText, repoPath } from './repo';
import { contract, resolveToken } from './tokens';
import { VERSION } from './version';

export interface HomeFacts {
  version: string;
  components: number;
  tokens: number;
  icons: number;
  /** Every foreground-on-background check in CONTRAST.md, Light and Dark, and how many pass. */
  contrast: { pass: number; total: number };
  shaders: number;
  foundations: number;
  charts: number;
  patterns: number;
}

/** The pages in a docs content folder, its index left out. */
function pages(folder: string): number {
  return readdirSync(repoPath('apps/docs/content/docs', folder)).filter(
    (f) => f.endsWith('.mdx') && f !== 'index.mdx',
  ).length;
}

/**
 * CONTRAST.md's rows: `| fg | value | role | needs | bg ratio, bg ratio, … | min | pass | source |`.
 * Each background is one check; reported rows (decorative, disabled) are not checks.
 */
function contrast(): { pass: number; total: number } {
  let pass = 0;
  let total = 0;
  for (const line of readRepoText('packages/tokens/CONTRAST.md').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    const result = cells[7];
    if (result !== 'pass' && result !== 'fail') continue;
    const checks = (cells[5] ?? '').split(',').length;
    total += checks;
    if (result === 'pass') pass += checks;
  }
  return { pass, total };
}

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

let cached: HomeFacts | undefined;

export function homeFacts(): HomeFacts {
  if (cached) return cached;
  const shaderSurface = catalog().find((e) => e.name === 'shader-surface');
  cached = {
    version: VERSION,
    components: catalog().filter((e) => e.kind === 'component').length,
    tokens: Object.values(contract().variables).filter((v) => v.public).length,
    icons: readRepoJson('apps/docs/.generated/icons/index.json', isList).filter(
      (i) => isRecord(i) && i['brand'] === false,
    ).length,
    contrast: contrast(),
    shaders: shaderSurface?.manifest?.variants?.['variant']?.length ?? 0,
    foundations: pages('foundations'),
    charts: pages('charts'),
    patterns: pages('patterns'),
  };
  return cached;
}

/** sRGB relative luminance of a `#rgb` or `#rrggbb` value (WCAG 2.2). */
function luminance(value: string): number {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value.trim());
  const hex =
    short === null
      ? value.trim()
      : `#${short
          .slice(1)
          .map((c) => c + c)
          .join('')}`;
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m === null) throw new Error(`docs: ${value} is not a #rgb or #rrggbb colour`);
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
    const v = Number.parseInt(c ?? '0', 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/**
 * The ink for a label on a colour swatch: in each scheme, whichever of text/primary and
 * text/inverse contrasts more with the swatch there, as one `light-dark()` value.
 */
export function swatchInk(token: string): string {
  const pick = (scheme: 'light' | 'dark'): string => {
    const ground = resolveToken(`--nz-${token}`, scheme);
    const [a, b] = ['text-primary', 'text-inverse'].map((t) =>
      ratio(ground, resolveToken(`--nz-${t}`, scheme)),
    );
    return (a ?? 0) >= (b ?? 0) ? 'var(--nz-text-primary)' : 'var(--nz-text-inverse)';
  };
  return `light-dark(${pick('light')}, ${pick('dark')})`;
}

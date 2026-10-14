// The Icons page's data, written by generate.ts before every build: every @nizivo/icons export,
// rendered once with react-dom/server from the built package, so the page shows exactly what the
// package draws.
// - .generated/icons/sprite.svg: one <symbol> per icon, served at /icons.svg (app/icons.svg/route.ts);
// - .generated/icons/index.json: name, export and import path of each icon, in manifest order.
// The grid then draws each icon as <svg><use href="/icons.svg#…"></svg>. Rendering 1,880 inline
// <svg> trees on one page would put every path twice in the static HTML (the markup and the RSC
// payload); the sprite is fetched once and cached.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isRecord } from './json.ts';
import { ExampleError } from './examples.ts';

export interface IconEntry {
  /** Lucide's kebab-case name, or the brand's slug: the subpath (`@nizivo/icons/<name>`). */
  name: string;
  /** The named export (`Calendar`). */
  exportName: string;
  /** The import a reader copies. */
  importPath: string;
  brand: boolean;
}

/** `arrow-down-0-1` → `ArrowDown01`, the rule packages/icons/scripts/generate.ts names exports by. */
function pascal(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function isComponent(value: unknown): value is ComponentType {
  return typeof value === 'function';
}

/** Root attributes a symbol keeps: the drawing ones. Size, naming and data-* stay per use. */
const KEEP = new Set([
  'viewBox',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
]);

/** `<svg a="1" …>inner</svg>` → `<symbol id="…" a="1" …>inner</symbol>`, kept attributes only. */
function toSymbol(markup: string, id: string): string {
  const open = /^<svg([^>]*)>/.exec(markup);
  if (!open || !markup.endsWith('</svg>')) {
    throw new ExampleError(`icons: ${id} did not render one <svg> element`);
  }
  const attrs = [...(open[1] ?? '').matchAll(/\s([\w:-]+)="([^"]*)"/g)]
    .filter((m) => KEEP.has(m[1] ?? ''))
    .map((m) => ` ${m[1]}="${m[2]}"`)
    .join('');
  const inner = markup.slice(open[0].length, -'</svg>'.length);
  return `<symbol id="${id}"${attrs}>${inner}</symbol>`;
}

export async function generateIcons(
  repoRoot: string,
): Promise<{ sprite: string; index: IconEntry[] }> {
  const manifest: unknown = JSON.parse(
    readFileSync(join(repoRoot, 'packages', 'icons', 'manifest.json'), 'utf8'),
  );
  if (!isRecord(manifest) || !isRecord(manifest.icons) || !isRecord(manifest.brands)) {
    throw new ExampleError('icons: packages/icons/manifest.json has no icons or brands');
  }
  const barrel: Record<string, unknown> = await import('@nizivo/icons');
  const index: IconEntry[] = [];
  const symbols: string[] = [];
  const add = (name: string, component: unknown, brand: boolean): void => {
    if (!isComponent(component)) {
      throw new ExampleError(`icons: @nizivo/icons has no component for ${name}; run pnpm build`);
    }
    const markup = renderToStaticMarkup(createElement(component));
    symbols.push(toSymbol(markup, name));
    index.push({
      name,
      exportName: pascal(name),
      importPath: brand ? `@nizivo/icons/brands/${name}` : `@nizivo/icons/${name}`,
      brand,
    });
  };
  for (const name of Object.keys(manifest.icons)) add(name, barrel[pascal(name)], false);
  const slugs = Object.keys(manifest.brands);
  const brands: Record<string, unknown>[] = await Promise.all(
    slugs.map(async (slug) => import(`@nizivo/icons/brands/${slug}`)),
  );
  slugs.forEach((slug, i) => add(slug, brands[i]?.[pascal(slug)], true));
  const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    `<!-- @nizivo/icons, ${index.length} glyphs: Lucide (ISC; Feather-derived icons MIT) and simple-icons (CC0-1.0). See packages/icons/THIRD_PARTY_NOTICES. -->`,
    ...symbols,
    '</svg>',
    '',
  ].join('\n');
  return { sprite, index };
}

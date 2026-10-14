// The @nizivo/icons generator (ARCHITECTURE.md §14.2). Build time only: nothing here ships.
//
//   node scripts/generate.ts             write src/index.ts, src/icons/*, src/brands/* (gitignored)
//                                        and THIRD_PARTY_NOTICES; skipped when nothing changed
//   node scripts/generate.ts --manifest  also rewrite manifest.json (after reviewing an upgrade)
//
// Inputs, all pinned or committed: lucide-static (every icon in icon-nodes.json, i.e. Lucide's current
// names, not its deprecated alias files), simple-icons (the brands in BRANDS), SVGO, aliases.json and
// mirror.json. The output is a pure function of them: no clock, no absolute path, sorted order.
//
// Each icon becomes one ESM module with no directive that hands its drawing to the shared, hand-written
// src/_internal/icon.tsx. The generated sources are not committed: ~1,900 files that change with every
// Lucide upgrade would bury the review. manifest.json is committed instead, one hash per icon, so an
// upgrade shows exactly which glyphs changed, appeared or disappeared (test/generate.test.ts).
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize, VERSION as SVGO_VERSION, type CustomPlugin, type XastRoot } from 'svgo';

export const PACKAGE_DIR: string = join(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

/** Brand glyphs from simple-icons, by slug, with the usage rule their doc comment carries. */
const BRANDS: Record<string, string> = {
  instagram:
    'Use it only for "Connect" or "Follow on Instagram" links (Instagram brand guidelines, https://about.meta.com/brand/resources/instagram).',
};

const TAGS = new Set(['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect']);
const ATTRIBUTES = new Set(
  ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2'].concat([
    'points',
    'fill',
  ]),
);

type Node = [tag: string, attributes: Record<string, string>];

export interface Manifest {
  'lucide-static': string;
  'simple-icons': string;
  svgo: string;
  /** Kebab-case icon name → the first 12 hex digits of the SHA-256 of its optimised drawing. */
  icons: Record<string, string>;
  brands: Record<string, string>;
  aliases: Record<string, string>;
}

export interface Generated {
  /** Paths relative to the package → contents. */
  files: Map<string, string>;
  manifest: Manifest;
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown, what: string): Record<string, string> {
  if (!isRecord(value)) throw new Error(`${what}: not an object`);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

/** Reads a committed manifest.json, checking its shape. */
export function readManifest(path: string): Manifest {
  const value = readJson(path);
  if (!isRecord(value)) throw new Error(`${path}: not an object`);
  return {
    'lucide-static': String(value['lucide-static']),
    'simple-icons': String(value['simple-icons']),
    svgo: String(value['svgo']),
    icons: strings(value['icons'], `${path} icons`),
    brands: strings(value['brands'], `${path} brands`),
    aliases: strings(value['aliases'], `${path} aliases`),
  };
}

/** `arrow-down-0-1` → `ArrowDown01`, as lucide-react names them. */
export function pascal(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Runs SVGO and returns the children of the root <svg> as [tag, attributes] pairs. */
function optimise(svg: string, name: string): Node[] {
  let root: XastRoot | undefined;
  const capture: CustomPlugin = {
    name: 'nzCapture',
    fn: (ast) => {
      root = ast;
      return null;
    },
  };
  optimize(svg, {
    multipass: true,
    // Lossless only: SVGO may rewrite how a path is written, never what it draws. Off: merging paths
    // (overlaps antialias differently), cubic-to-quadratic (mis-reflects a following smooth curve:
    // Lucide `drama`, SVGO 4.1.0), curve straightening, arc-radius rounding (`lasso-select`) and
    // dropping or adding a closing `z` (a closed corner becomes two caps). 4 decimals keep Simple
    // Icons' precision. A Chromium pixel comparison against the sources checks this (W4).
    floatPrecision: 4,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            mergePaths: false,
            // Lucide's shapes are shorter than the paths they would become.
            convertShapeToPath: false,
            convertPathData: {
              convertToQ: false,
              straightCurves: false,
              smartArcRounding: false,
              convertToZ: false,
              removeUseless: false,
              // `a2 2 0 001.68-.92`, as Lucide writes it: valid path grammar, and shorter.
              noSpaceAfterFlags: true,
            },
          },
        },
      },
      capture,
    ],
  });
  const element = root?.children.find((child) => child.type === 'element' && child.name === 'svg');
  if (element?.type !== 'element') throw new Error(`${name}: SVGO returned no <svg>`);
  return element.children.flatMap((child): Node[] => {
    // simple-icons ships a <title>; the accessible name comes from the `label` prop instead.
    if (child.type !== 'element' || child.name === 'title') return [];
    if (!TAGS.has(child.name)) throw new Error(`${name}: unexpected <${child.name}>`);
    for (const attribute of Object.keys(child.attributes)) {
      if (!ATTRIBUTES.has(attribute)) throw new Error(`${name}: unexpected ${attribute}=`);
    }
    return [[child.name, { ...child.attributes }]];
  });
}

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);
}

/** A TS literal with single quotes, as oxfmt writes it. The values never contain quotes. */
function literal(nodes: readonly Node[]): string {
  const items = nodes.map(([tag, attributes]) => {
    const pairs = Object.entries(attributes).map(([key, value]) => `${key}: '${value}'`);
    return `  ['${tag}', { ${pairs.join(', ')} }],`;
  });
  return `[\n${items.join('\n')}\n]`;
}

function iconModule(
  name: string,
  nodes: readonly Node[],
  mirrors: boolean,
  lucide: string,
): string {
  return `// GENERATED by scripts/generate.ts from lucide-static ${lucide} (ISC; THIRD_PARTY_NOTICES). Do not edit.
import type { JSX } from 'react';
import { renderIcon, type IconNode, type IconProps } from '../_internal/icon';

const nodes: IconNode = ${literal(nodes)};

/** Lucide \`${name}\`${mirrors ? ', mirrored in right-to-left text' : ''}. https://lucide.dev/icons/${name} */
export function ${pascal(name)}(props: IconProps): JSX.Element {
  return renderIcon(props, nodes${mirrors ? ', true' : ''});
}
`;
}

function aliasModule(alias: string, target: string): string {
  return `// GENERATED by scripts/generate.ts from aliases.json. Do not edit.
import type { JSX } from 'react';
import type { IconProps } from '../_internal/icon';
import { ${pascal(target)} } from './${target}';

/** @deprecated Renamed: use \`${pascal(target)}\` (Lucide \`${target}\`). */
export const ${pascal(alias)}: (props: IconProps) => JSX.Element = ${pascal(target)};
`;
}

function brandModule(
  slug: string,
  title: string,
  d: string,
  rule: string,
  version: string,
): string {
  return `// GENERATED by scripts/generate.ts from simple-icons ${version} (CC0-1.0; THIRD_PARTY_NOTICES). Do not edit.
import type { JSX } from 'react';
import { renderBrand, type BrandIconProps } from '../_internal/icon';

const d = '${d}';

/**
 * The ${title} logo, filled with \`currentColor\`. ${title} is a trademark of its owner; showing it implies
 * no endorsement. ${rule}
 */
export function ${pascal(slug)}(props: BrandIconProps): JSX.Element {
  return renderBrand(props, d);
}
`;
}

function notices(lucide: { version: string; license: string }, simpleIcons: string): string {
  const rule = '-'.repeat(80);
  const brands = Object.keys(BRANDS).map((slug) => `  ${slug}  (dist/brands/${slug}.js)`);
  return `@nizivo/icons includes material from the following third-party projects.
This file is written by scripts/generate.ts; do not edit it by hand.

${rule}
Lucide (https://lucide.dev), lucide-static ${lucide.version}

Every module in dist/icons/ draws a Lucide icon from its SVG path data. Lucide's
licence, reproduced verbatim from lucide-static ${lucide.version}, covers all of them, and its
second part covers the Feather-derived icons it lists (Feather, https://feathericons.com).
Some of those are listed by their former Lucide names (for example x-circle is circle-x).

${lucide.license.trim()}

${rule}
Simple Icons (https://simpleicons.org), simple-icons ${simpleIcons}

The brand glyphs in dist/brands/ reuse Simple Icons path data:

${brands.join('\n')}

Simple Icons is released under CC0 1.0 Universal (public domain dedication,
https://creativecommons.org/publicdomain/zero/1.0/). CC0 waives copyright only: the
logos remain trademarks of their owners and are not licensed by this package.
Instagram is a trademark of Instagram, LLC (Meta Platforms, Inc.). Use the Instagram
glyph only for "Connect" or "Follow on Instagram" links, as Instagram's brand
guidelines ask (https://about.meta.com/brand/resources/instagram); using it implies
no endorsement by Meta. See also Simple Icons' disclaimer:
https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md
`;
}

function readConfig(file: string, key: string): unknown {
  const json = readJson(join(PACKAGE_DIR, file));
  if (!isRecord(json) || !(key in json)) throw new Error(`${file}: no "${key}"`);
  return json[key];
}

export function generate(): Generated {
  const lucideDir = dirname(require.resolve('lucide-static/package.json'));
  const lucideManifest = readJson(join(lucideDir, 'package.json'));
  const iconNodes = readJson(join(lucideDir, 'icon-nodes.json'));
  if (!isRecord(lucideManifest) || !isRecord(iconNodes)) throw new Error('lucide-static: bad JSON');
  const lucide = {
    version: String(lucideManifest['version']),
    license: readFileSync(join(lucideDir, 'LICENSE'), 'utf8'),
  };

  const brandSvg = fileURLToPath(import.meta.resolve('simple-icons/icons/instagram.svg'));
  const simpleIconsDir = dirname(dirname(brandSvg));
  const simpleIconsManifest = readJson(join(simpleIconsDir, 'package.json'));
  const simpleIcons = isRecord(simpleIconsManifest) ? String(simpleIconsManifest['version']) : '';

  const mirror = readConfig('mirror.json', 'icons');
  const aliases = readConfig('aliases.json', 'icons');
  if (!Array.isArray(mirror) || !isRecord(aliases)) throw new Error('mirror.json or aliases.json');

  const names = Object.keys(iconNodes).toSorted();
  const known = new Set(names);
  for (const name of mirror) {
    if (!known.has(String(name))) throw new Error(`mirror.json: Lucide has no "${String(name)}"`);
  }
  const mirrored = new Set(mirror.map(String));

  const files = new Map<string, string>();
  const manifest: Manifest = {
    'lucide-static': lucide.version,
    'simple-icons': simpleIcons,
    svgo: SVGO_VERSION,
    icons: {},
    brands: {},
    aliases: {},
  };
  const exports: string[] = [];

  for (const name of names) {
    const svg = readFileSync(join(lucideDir, 'icons', `${name}.svg`), 'utf8');
    const nodes = optimise(svg, name);
    manifest.icons[name] = hash(nodes);
    files.set(`src/icons/${name}.ts`, iconModule(name, nodes, mirrored.has(name), lucide.version));
    exports.push(`export { ${pascal(name)} } from './icons/${name}';`);
  }

  for (const [alias, target] of Object.entries(aliases).toSorted(([a], [b]) => (a < b ? -1 : 1))) {
    if (known.has(alias)) throw new Error(`aliases.json: "${alias}" is a current Lucide name`);
    if (typeof target !== 'string' || !known.has(target)) {
      throw new Error(`aliases.json: "${alias}" → unknown icon "${String(target)}"`);
    }
    manifest.aliases[alias] = target;
    files.set(`src/icons/${alias}.ts`, aliasModule(alias, target));
    exports.push(`export { ${pascal(alias)} } from './icons/${alias}';`);
  }

  const brandData = readJson(join(simpleIconsDir, 'data', 'simple-icons.json'));
  const listed = isRecord(brandData) ? brandData['icons'] : brandData;
  const brandList: unknown[] = Array.isArray(listed) ? listed : [];
  for (const [slug, rule] of Object.entries(BRANDS)) {
    const svg = readFileSync(join(simpleIconsDir, 'icons', `${slug}.svg`), 'utf8');
    const [path, ...more] = optimise(svg, slug);
    const d = path?.[1]['d'];
    if (path?.[0] !== 'path' || d === undefined || more.length > 0) {
      throw new Error(`simple-icons ${slug}: expected one <path>`);
    }
    const entry = brandList.find((item) => isRecord(item) && item['slug'] === slug);
    const title = isRecord(entry) ? String(entry['title']) : pascal(slug);
    manifest.brands[slug] = hash(d);
    files.set(`src/brands/${slug}.ts`, brandModule(slug, title, d, rule, simpleIcons));
  }

  files.set(
    'src/index.ts',
    `// GENERATED by scripts/generate.ts. Do not edit. Every Lucide icon by name; brand glyphs are only
// at @nizivo/icons/brands/<name>. Pure re-exports with no directive: a bundler keeps only what is used.
export type { BrandIconProps, IconProps } from './_internal/icon';
${exports.join('\n')}
`,
  );
  files.set('THIRD_PARTY_NOTICES', notices(lucide, simpleIcons));
  return { files, manifest };
}

export function manifestText(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** Writes `text` to `path` through a rename, so parallel runs (build, typecheck, test) never tear. */
function writeIfChanged(path: string, text: string): void {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, path);
}

/** Every input the output depends on, so an unchanged tree is not regenerated. */
function fingerprint(): string {
  const inputs = [
    readFileSync(fileURLToPath(import.meta.url), 'utf8'),
    readFileSync(join(PACKAGE_DIR, 'aliases.json'), 'utf8'),
    readFileSync(join(PACKAGE_DIR, 'mirror.json'), 'utf8'),
    readFileSync(require.resolve('lucide-static/package.json'), 'utf8'),
    readFileSync(
      join(
        fileURLToPath(import.meta.resolve('simple-icons/icons/instagram.svg')),
        '../../package.json',
      ),
      'utf8',
    ),
    SVGO_VERSION,
  ];
  return createHash('sha256').update(inputs.join('\0')).digest('hex');
}

function main(): void {
  const writeManifest = process.argv.includes('--manifest');
  const stamp = join(PACKAGE_DIR, 'src', '.generated');
  const print = fingerprint();
  if (!writeManifest && existsSync(stamp) && readFileSync(stamp, 'utf8') === print) return;

  const { files, manifest } = generate();
  for (const folder of ['icons', 'brands']) {
    const dir = join(PACKAGE_DIR, 'src', folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!files.has(`src/${folder}/${file}`) && !file.endsWith('.tmp')) rmSync(join(dir, file));
    }
  }
  for (const [path, text] of files) writeIfChanged(join(PACKAGE_DIR, path), text);
  if (writeManifest) writeIfChanged(join(PACKAGE_DIR, 'manifest.json'), manifestText(manifest));
  writeIfChanged(stamp, print);
  console.log(
    `@nizivo/icons: ${Object.keys(manifest.icons).length} icons, ` +
      `${Object.keys(manifest.aliases).length} aliases, ${Object.keys(manifest.brands).length} brands`,
  );
}

if (import.meta.main) main();

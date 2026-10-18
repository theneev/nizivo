// tokens.css for @nizivo/tokens (plan §7.3–§7.5): value transforms and the permutation wrappers that
// plugin-css prints. Colours are folded into one `light-dark()` declaration on :root; theme scopes
// set only `color-scheme`; motion and viewport scopes re-declare only their own modifier's tokens.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type {
  ColorValueNormalized,
  DimensionValue,
  Plugin,
  Resolver,
  ShadowValueNormalized,
  TokenNormalized,
} from '@terrazzo/parser';
import type { Permutation } from '@terrazzo/plugin-css';
import {
  transformCSSValue,
  transformFontFamily,
  type TransformCSSValueOptions,
} from '@terrazzo/token-tools/css';

export const PREFIX: string = process.env.NZ_TOKEN_PREFIX ?? 'nz';

/** The canonical layer order (plan §8.1), from the repo's contracts/layers.css. */
function readLayers(): string[] {
  const file = new URL('../../../contracts/layers.css', import.meta.url);
  const statement = readFileSync(file, 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  const names = /^@layer ([a-z.]+(?:, [a-z.]+)*);$/.exec(statement)?.[1]?.split(', ');
  if (names?.[0] !== 'nz.tokens') {
    throw new Error(
      `${fileURLToPath(file)} must hold one @layer statement that starts with nz.tokens`,
    );
  }
  return names;
}
export const LAYERS: string[] = readLayers();

/** `color.bg.surface` → `--nz-bg-surface`: there is no `--nz-color-*` family (plan §7.2). */
export const variableName = (token: { id: string }): string =>
  `--${PREFIX}-${token.id.replace(/^color\./, '').replaceAll('.', '-')}`;

/** A text style's letter spacing is published as `--nz-tracking-<style>` (plan §7.2). */
export const subValueVariableName = (name: string, subValue: string): string =>
  subValue === 'letter-spacing'
    ? name.replace(`--${PREFIX}-font-`, `--${PREFIX}-tracking-`)
    : `${name}-${subValue}`;

export const BASE_INPUT = { theme: 'light', motion: 'default', viewport: 'mobile' } as const;

/** Each scoped block re-declares only its own modifier's groups (spike S3a's include recipe). */
export const MOTION_GROUPS: string[] = [
  'duration.**',
  'easing.**',
  'distance.**',
  'scale.**',
  'tilt.**',
  'stagger.**',
  'magnetic.**',
];
export const VIEWPORT_GROUPS: string[] = ['grid.**', 'layout.**', 'type.**', 'section.**'];
export const PRIMITIVES: string[] = ['color.p.**'];
/** Never variables: frame widths (plan §7.2) and breakpoints (custom media only). */
export const NOT_EMITTED: string[] = ['layout.viewport', 'breakpoint.**'];

/** Figma text styles carry only a family name; the stack is code-owned (plan §7.6, §14.4). */
const FAMILY_TOKENS: Record<string, string> = {
  Geist: 'font.family.sans',
  'Geist Mono': 'font.family.mono',
};

/** Gap report C §2.3: dark shadows keep Figma's geometry in black at min(0.6, 6 × light alpha). */
const DARK_SHADOW_FACTOR = 6;
const DARK_SHADOW_MAX = 0.6;

const round = (value: number, digits: number): number => Number(value.toFixed(digits));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `$extensions[key][field]` of a token, when it is a value of the expected type. */
function extension<T>(
  token: TokenNormalized,
  key: string,
  field: string,
  is: (value: unknown) => value is T,
): T | undefined {
  const group = token.$extensions?.[key];
  const value = isRecord(group) ? group[field] : undefined;
  return is(value) ? value : undefined;
}
const isNumber = (value: unknown): value is number => typeof value === 'number';
const isString = (value: unknown): value is string => typeof value === 'string';

// The resolver is only handed to plugins, so this one keeps it for the light-dark() transform.
let captured: Resolver | undefined;
export const captureResolver: Plugin = {
  name: 'nizivo:capture-resolver',
  enforce: 'pre',
  transform(options) {
    captured = options.resolver;
  },
};
export function currentResolver(): Resolver {
  if (!captured) throw new Error('The resolver is read before the transform step ran');
  return captured;
}

/** A dimension as CSS, with a bare `0`. */
function dimension({ value, unit }: DimensionValue): string {
  return value === 0 ? '0' : `${value}${unit}`;
}

/** A translucent sRGB colour as `rgb(r g b / a)`; undefined when opaque (plugin-css prints those). */
function translucent(color: ColorValueNormalized): string | undefined {
  if (color.alpha >= 1) return undefined;
  if (color.alpha === 0) return 'transparent';
  if (color.colorSpace !== 'srgb')
    throw new Error(`Only sRGB colours are supported, got ${color.colorSpace}`);
  const [r, g, b] = color.components.map((c) => Math.round((c ?? 0) * 255));
  return `rgb(${r} ${g} ${b} / ${round(color.alpha, 3)})`;
}

function colorCss(color: ColorValueNormalized): string {
  const hex = color.components.map((c) =>
    Math.round((c ?? 0) * 255)
      .toString(16)
      .padStart(2, '0'),
  );
  return translucent(color) ?? `#${hex.join('')}`;
}

function shadowLayer(layer: ShadowValueNormalized, color: string): string {
  const geometry = [layer.offsetX, layer.offsetY, layer.blur, layer.spread].map(dimension);
  return [...(layer.inset ? ['inset'] : []), ...geometry, color].join(' ');
}

/**
 * The colour of each shadow layer: `var()` of the colour token a layer is bound to (Figma's
 * Focus/Ring binds two layers to border/focus and bg/surface), so the layer follows the theme;
 * otherwise undefined, and the caller prints the literal. Never the resolved alias, which is the
 * light value only.
 */
function layerAliases(token: TokenNormalized & { $type: 'shadow' }): (string | undefined)[] {
  return token.$value.map((_, index) => {
    const ref = token.partialAliasOf?.[index]?.color;
    return ref === undefined ? undefined : `var(${variableName({ id: ref })})`;
  });
}

/** A no-op layer: a flat elevation with no layers still composes in a comma-separated shadow list. */
const NO_SHADOW = '0 0 0 0 transparent';

/**
 * `elevation.<n>`: Figma's light layers, each colour paired with its dark value in `light-dark()`
 * (one colour when the two are equal), behind a hairline ring that is transparent in light; levels 3
 * and 4 also take the inner highlight (gap report C §2.3, plan §7.5).
 *
 * A flat elevation, one whose every layer is fully transparent, takes neither: the ring stands in for
 * shadows that dark surfaces swallow, and a layer at alpha 0 paints nothing at any size, in light or
 * in dark (its dark alpha is 6 × 0). Figma's `Elevation/0 Flat` is such a style since 2026-10-14
 * (one invisible drop shadow). The rule reads the layers, not the level, so a visible level 0 would
 * take the ring like any raised surface.
 */
export function elevation(
  id: string,
  layers: ShadowValueNormalized[],
  aliases: (string | undefined)[] = [],
): string {
  const level = Number(id.split('.')[1]);
  const themed = layers.map((layer, index) => {
    const bound = aliases[index];
    if (bound !== undefined) return shadowLayer(layer, bound);
    const alpha = Math.min(DARK_SHADOW_MAX, round(layer.color.alpha * DARK_SHADOW_FACTOR, 3));
    const light = colorCss(layer.color);
    const dark = translucent({ colorSpace: 'srgb', components: [0, 0, 0], alpha }) ?? '#000';
    return shadowLayer(layer, light === dark ? light : `light-dark(${light}, ${dark})`);
  });
  const flat = layers.every(
    (layer, index) => aliases[index] === undefined && layer.color.alpha === 0,
  );
  if (flat) return themed.join(', ') || NO_SHADOW;
  const ring = `0 0 0 1px var(${variableName({ id: 'color.elevation.ring' })})`;
  const highlight = `inset 0 1px 0 0 var(${variableName({ id: 'color.elevation.highlight' })})`;
  return [...(level >= 3 ? [highlight] : []), ring, ...themed].join(', ');
}

/** Semantic colours get `light-dark()`; primitives are the same in every theme. */
export const isThemed = (token: TokenNormalized): boolean =>
  token.$type === 'color' && token.id.startsWith('color.') && !token.id.startsWith('color.p.');

/** Rewrites `{token.id}` references inside a string token to `var()`. */
function stringValue(value: string, id: string, options: TransformCSSValueOptions): string {
  return value.replaceAll(/\{([a-z0-9.-]+)\}/g, (_, ref: string) => {
    if (!options.tokensSet[ref]) throw new Error(`${id}: unknown reference {${ref}}`);
    return `var(${variableName({ id: ref })})`;
  });
}

/** The family sub-value points at a family token; tracking is `em` from Figma's letter-spacing %. */
function typography(
  token: TokenNormalized & { $type: 'typography' },
  options: TransformCSSValueOptions,
): Record<string, string> {
  const value = transformCSSValue(token, options);
  if (typeof value !== 'object') throw new Error(`${token.id}: expected typography sub-values`);
  if (!token.partialAliasOf?.fontFamily) {
    const family = [token.$value.fontFamily].flat()[0] ?? '';
    const id = FAMILY_TOKENS[family];
    if (!id) throw new Error(`${token.id}: no family token for "${family}"`);
    value['font-family'] = `var(${variableName({ id })})`;
  }
  const percent = extension(token, 'dev.nizivo.figma', 'letterSpacingPercent', isNumber);
  const { letterSpacing, fontSize } = token.$value;
  let em: number;
  if (percent !== undefined) em = percent / 100;
  else if (letterSpacing.unit === fontSize.unit) em = letterSpacing.value / fontSize.value;
  else throw new Error(`${token.id}: letter spacing and font size use different units`);
  value['letter-spacing'] = `${round(em, 5)}em`;
  return value;
}

/** `var(--font-geist-sans, "Geist"), ui-sans-serif, …`: the next/font variable wraps the first family. */
function fontFamily(
  token: TokenNormalized & { $type: 'fontFamily' },
  options: TransformCSSValueOptions,
): string {
  const hook = extension(token, 'app.nizivo.font', 'variable', isString);
  const [first, ...rest] = token.$value;
  if (!hook || first === undefined) return transformFontFamily(token, options);
  const fallbacks =
    rest.length > 0 ? [transformFontFamily({ ...token, $value: rest }, options)] : [];
  return [`var(${hook}, "${first}")`, ...fallbacks].join(', ');
}

/** Value transform for every permutation; undefined falls back to plugin-css's own. */
export function tokenValue(
  token: TokenNormalized,
  options: TransformCSSValueOptions,
): string | Record<string, string> | undefined {
  if (token.aliasOf) return undefined;
  switch (token.$type) {
    case 'color':
      return translucent(token.$value);
    case 'cubicBezier':
      return token.$value.join(',') === '0,0,1,1' ? 'linear' : undefined;
    case 'shadow': {
      const aliases = layerAliases(token);
      return /^elevation\.\d+$/.test(token.id)
        ? elevation(token.id, token.$value, aliases)
        : token.$value
            .map((layer, index) => shadowLayer(layer, aliases[index] ?? colorCss(layer.color)))
            .join(', ');
    }
    case 'string':
      return stringValue(token.$value, token.id, options);
    case 'typography':
      return typography(token, options);
    case 'fontFamily':
      return fontFamily(token, options);
    default:
      return undefined;
  }
}

function colorValue(token: TokenNormalized, options: TransformCSSValueOptions): string {
  const value = tokenValue(token, options) ?? transformCSSValue(token, options);
  if (typeof value !== 'string') throw new Error(`${token.id}: not a colour`);
  return value;
}

/** The base permutation: one declaration per semantic colour, `light-dark(light, dark)` when they differ. */
export function lightDark(
  token: TokenNormalized,
  options: TransformCSSValueOptions,
): string | Record<string, string> | undefined {
  if (!isThemed(token)) return tokenValue(token, options);
  const darkSet = currentResolver().apply({ ...options.permutation, theme: 'dark' });
  const darkToken = darkSet[token.id];
  if (!darkToken) throw new Error(`${token.id} has no dark value`);
  const light = colorValue(token, options);
  const dark = colorValue(darkToken, { ...options, tokensSet: darkSet });
  return light === dark ? light : `light-dark(${light}, ${dark})`;
}

/** A breakpoint's media query, read from the code-owned `breakpoint.*` tokens. */
export function breakpointQuery(name: string): string {
  const token = currentResolver().apply({})[`breakpoint.${name}`];
  if (token?.$type !== 'dimension') throw new Error(`No breakpoint.${name} token`);
  return `(width >= ${dimension(token.$value)})`;
}

/** Drops the description comments plugin-css prints: tokens.css carries values only. */
const values = (declarations: string): string =>
  declarations
    .split('\n')
    .filter((line) => !/^\s*\/\*.*\*\/$/.test(line))
    .join('\n')
    .trimStart();

const v = (name: string): string => `--${PREFIX}-${name}`;

/** `--nz-scheme-inverse` per theme: the theme scopes below and tokens.json both read it. */
export const INVERSE_SCHEME = { light: 'dark', dark: 'light' } as const;

/**
 * Theme scopes set only `color-scheme`, so :root (none) renders light until the app opts in
 * (plan §7.4). Inverse surfaces flip to the opposite scheme; an inverse inside an inverse stays
 * inverse (builder default D-e).
 */
const THEME_SCOPES = `[data-nz-theme="light"] {
    color-scheme: light;
    ${v('scheme-inverse')}: ${INVERSE_SCHEME.light};
  }
  [data-nz-theme="dark"] {
    color-scheme: dark;
    ${v('scheme-inverse')}: ${INVERSE_SCHEME.dark};
  }
  [data-nz-theme="system"] {
    color-scheme: light dark;
    ${v('scheme-inverse')}: ${INVERSE_SCHEME.light};
  }
  @media (prefers-color-scheme: dark) {
    [data-nz-theme="system"] {
      ${v('scheme-inverse')}: ${INVERSE_SCHEME.dark};
    }
  }
  [data-nz-scheme="inverse"] {
    color-scheme: var(${v('scheme-inverse')});
  }`;

// Terrazzo infers the indentation from the text before the declarations in each template.
const media =
  (query: () => string, close = false) =>
  (declarations: string): string =>
    `  @media ${query()} {
    :root {
      ${values(declarations)}
    }
  }${close ? '\n}' : ''}`;

/** The OS setting and the `data-nz-motion` override get the same declarations (plan §7.4). */
const reduced = (declarations: string): string =>
  `${media(() => '(prefers-reduced-motion: reduce)')(declarations)}
  [data-nz-motion="reduce"] {
    ${values(declarations).replaceAll('\n      ', '\n    ')}
  }`;

/** The permutations, in output order. The first opens `@layer nz.tokens`, the last closes it. */
export function permutations(version: string): Permutation[] {
  const root = (declarations: string): string =>
    `@layer ${LAYERS.join(', ')};
@layer nz.tokens {
  :root {
    ${v('css-version')}: "${version}";
    ${values(declarations)}
  }

  ${THEME_SCOPES}`;

  // Scoped blocks: `only` keeps the set tokens (primitives) out, so each re-declares
  // just its own modifier's tokens. No permutation repeats the defaults: its id would collide with
  // the base block's (S3a).
  return [
    { input: BASE_INPUT, exclude: NOT_EMITTED, transform: lightDark, prepare: root },
    {
      input: { motion: 'reduced' },
      only: { modifiers: ['motion'], sets: [] },
      include: MOTION_GROUPS,
      exclude: PRIMITIVES,
      prepare: reduced,
    },
    {
      input: { viewport: 'tablet' },
      only: { modifiers: ['viewport'], sets: [] },
      include: VIEWPORT_GROUPS,
      exclude: [...PRIMITIVES, ...NOT_EMITTED],
      prepare: media(() => breakpointQuery('sm')),
    },
    {
      input: { viewport: 'desktop' },
      only: { modifiers: ['viewport'], sets: [] },
      include: VIEWPORT_GROUPS,
      exclude: [...PRIMITIVES, ...NOT_EMITTED],
      prepare: media(() => breakpointQuery('lg'), true),
    },
  ];
}

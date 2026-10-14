/**
 * packages/react/styles/base.css: the a11y floor in `@layer nz.base` (ARCHITECTURE.md §8.5), then
 * the utilities in `@layer nz.utilities` (§5.2, §8.1). The floor's selector lists come from each
 * component.json (`interactive`, `focusTarget`, `stateIndicator`; gen/COMPONENT-JSON.md), so a new
 * component cannot forget them; the rest is fixed. Printed as oxfmt prints CSS, so `oxfmt --check`
 * and `nz gen --check` agree.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { HEADER } from './format.ts';
import {
  type ComponentConfig,
  type FocusTarget,
  focusTargetOf,
  type Paint,
  validateComponentConfig,
} from './schema.ts';

const PRINT_WIDTH = 100;
const OUTLINE = [
  'outline: var(--nz-border-width-focus) solid var(--nz-border-focus);',
  'outline-offset: 2px;',
];
const FOCUS_SUFFIX: Record<FocusTarget, string> = {
  self: ':is(:focus-visible, [data-focus-visible])',
  // [data-focus-visible]: WebKit matches no :focus-visible on a radio reached by an arrow key, so the
  // component reports it (SegmentedControl, W3).
  'nested-input': ':is(:has(> input:focus-visible), [data-focus-visible])',
  within: ':focus-within',
};
const FOCUS_ORDER: readonly FocusTarget[] = ['self', 'nested-input', 'within'];
const PAINT: Record<Paint, string[]> = {
  border: ['border: 1px solid CanvasText;'],
  fill: ['background: Highlight;', 'forced-color-adjust: none;'],
  highlight: ['background: Highlight;', 'color: HighlightText;', 'forced-color-adjust: none;'],
  mark: ['background: CanvasText;', 'forced-color-adjust: none;'],
  outline: ['outline: 2px solid Highlight;'],
};
const PAINT_ORDER: readonly Paint[] = ['border', 'fill', 'highlight', 'mark', 'outline'];
/** Hidden on screen, still read by assistive technology. */
const VISUALLY_HIDDEN = [
  'position: absolute;',
  'inline-size: 1px;',
  'block-size: 1px;',
  'margin: -1px;',
  'padding: 0;',
  'border: 0;',
  'overflow: hidden;',
  'clip-path: inset(50%);',
  'white-space: nowrap;',
];
const HIT_AREA = [
  "content: '';",
  'position: absolute;',
  'inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));',
];

function block(indent: string, selector: string, declarations: readonly string[]): string[] {
  return [
    `${indent}${selector} {`,
    ...declarations.map((declaration) => `${indent}  ${declaration}`),
    `${indent}}`,
  ];
}

/**
 * `:where(.nz-a, .nz-b)<suffix>`, broken where oxfmt breaks it: the `:where()` list one class per
 * line when the line up to the suffix's own opening parenthesis overflows, then the suffix's
 * arguments when what is left of the line still overflows.
 */
function whereRule(
  indent: string,
  slots: readonly string[],
  suffix: string,
  declarations: readonly string[],
): string[] {
  const classes = slots.map((slot) => `.nz-${slot}`);
  const flat = `:where(${classes.join(', ')})`;
  const group = /^(:[a-z-]+\()(.*)\)$/.exec(suffix);
  const head = group?.[1] ?? `${suffix} {`;
  const whereFits = `${indent}${flat}${head}`.length <= PRINT_WIDTH;
  const where = whereFits
    ? flat
    : `:where(\n${classes.map((name) => `${indent}  ${name}`).join(',\n')}\n${indent})`;
  const lineSoFar = whereFits ? `${indent}${flat}` : `${indent})`;
  let tail = suffix;
  if (
    group?.[1] !== undefined &&
    group[2] !== undefined &&
    `${lineSoFar}${suffix} {`.length > PRINT_WIDTH
  ) {
    const args = group[2].split(', ');
    tail = `${group[1]}\n${args.map((arg) => `${indent}  ${arg}`).join(',\n')}\n${indent})`;
  }
  return block(indent, `${where}${tail}`, declarations);
}

const sorted = (items: Iterable<string>): string[] => [...new Set(items)].toSorted();

/** The text of base.css for these components. `layerStatement` is contracts/layers.css's line. */
export function baseCss(configs: readonly ComponentConfig[], layerStatement: string): string {
  const focus = new Map<FocusTarget, string[]>(FOCUS_ORDER.map((mode) => [mode, []]));
  const indicators = new Map<string, { state: string; paint: Paint; slots: string[] }>();
  for (const config of configs) {
    for (const slot of config.interactive ?? []) {
      focus.get(focusTargetOf(config, slot))?.push(slot);
    }
    for (const { slot, state = '', paint } of config.stateIndicator ?? []) {
      const key = `${state}\n${paint}`;
      const group = indicators.get(key) ?? { state, paint, slots: [] };
      group.slots.push(slot);
      indicators.set(key, group);
    }
  }

  const lines: string[] = [
    layerStatement,
    '',
    `/* ${HEADER}.`,
    '   The a11y floor (ARCHITECTURE.md §8.5), which survives any component re-skin. The selector',
    '   lists come from each component.json: interactive, focusTarget and stateIndicator. */',
    '@layer nz.base {',
    '  /* a 2 px solid outline is the focus indicator; components may add the halo as decoration */',
  ];
  for (const mode of FOCUS_ORDER) {
    const slots = sorted(focus.get(mode) ?? []);
    if (slots.length > 0) lines.push(...whereRule('  ', slots, FOCUS_SUFFIX[mode], OUTLINE));
  }
  lines.push(
    '  /* inside clipped scrollers (DialogBody, table cells) */',
    ...block('  ', '[data-focus-inset]:is(:focus-visible, [data-focus-visible], :focus-within)', [
      'outline-offset: -2px;',
    ]),
    ...block('  ', '[data-focus-inset]:has(> input:focus-visible)', ['outline-offset: -2px;']),
  );

  const pressable = sorted([...(focus.get('self') ?? []), ...(focus.get('nested-input') ?? [])]);
  if (pressable.length > 0) {
    lines.push(
      '  /* survives a blocked engine <style> under a strict CSP (gap report B §B1.3) */',
      ...whereRule('  ', pressable, '', ['touch-action: pan-x pan-y pinch-zoom;']),
    );
  }

  lines.push(
    '  /* 44 px on both axes on a coarse primary pointer (::after is reserved for this) */',
    ...block('  ', '.nz-hit-target', ['position: relative;']),
    '  @media (pointer: coarse) {',
    ...block('    ', '.nz-hit-target:not([data-hit-inset])::after', HIT_AREA),
    '  }',
    ...block(
      '  ',
      "[data-nz-touch-targets='always'] .nz-hit-target:not([data-hit-inset])::after",
      HIT_AREA,
    ),
    ...block('  ', ":dir(rtl) [data-mirror='rtl']", ['scale: -1 1;']),
    '  html {',
    '    scroll-padding-block: var(--nz-layout-top-inset, 0px)',
    '      calc(var(--nz-layout-bottom-inset, 0px) + var(--nz-toast-inset, 0px));',
    '  }',
  );

  const groups = [...indicators.values()].toSorted(
    (a, b) =>
      (a.state < b.state ? -1 : a.state > b.state ? 1 : 0) ||
      PAINT_ORDER.indexOf(a.paint) - PAINT_ORDER.indexOf(b.paint),
  );
  if (groups.length > 0) {
    lines.push(
      '  /* forced colours drop backgrounds and shadows: system colours carry edges and state */',
      '  @media (forced-colors: active) {',
    );
    for (const { state, paint, slots } of groups) {
      lines.push(...whereRule('    ', sorted(slots), state, PAINT[paint]));
    }
    lines.push('  }');
  }
  lines.push(
    '}',
    '',
    '/* utilities beat component CSS whatever the import order */',
    '@layer nz.utilities {',
    ...block('  ', '.nz-visually-hidden', VISUALLY_HIDDEN),
    '}',
  );
  return `${lines.join('\n')}\n`;
}

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name))
    .toSorted();
}

/**
 * Reads every component.json under packages/react/src and contracts/layers.css from `root`, and
 * returns base.css's path and content. Throws on an invalid component.json; nz gen validates them
 * all first, so that never happens through `nz gen`.
 */
export function generateBaseCss(root: string): { file: string; content: string } {
  const src = join(root, 'packages', 'react', 'src');
  const configs: ComponentConfig[] = [];
  for (const dir of subdirs(src)) {
    const unstable = basename(dir) === 'unstable';
    for (const folder of unstable ? subdirs(dir) : [dir]) {
      const file = join(folder, 'component.json');
      if (!existsSync(file)) continue;
      const result = validateComponentConfig(
        JSON.parse(readFileSync(file, 'utf8')),
        basename(folder),
        unstable,
      );
      if ('errors' in result) {
        throw new Error(
          `${relative(root, file).split(sep).join('/')}: ${result.errors.join('; ')}`,
        );
      }
      configs.push(result.config);
    }
  }
  const layers = join(root, 'contracts', 'layers.css');
  if (!existsSync(layers)) throw new Error('contracts/layers.css is missing');
  const statement = readFileSync(layers, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('@layer '));
  if (statement === undefined) throw new Error('contracts/layers.css holds no @layer statement');
  return {
    file: join(root, 'packages', 'react', 'styles', 'base.css'),
    content: baseCss(configs, statement),
  };
}

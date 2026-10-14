import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { baseCss, generateBaseCss } from '../gen/base-css.ts';
import type { ComponentConfig } from '../gen/schema.ts';

const LAYERS =
  '@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;';
const fixture = fileURLToPath(new URL('fixtures/repo', import.meta.url));
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const config = (fields: Partial<ComponentConfig> & { name: string }): ComponentConfig => ({
  status: 'stable',
  tier: 'server',
  ...fields,
});

/** The W1 manifests (gen/COMPONENT-JSON.md). */
const W1: ComponentConfig[] = [
  config({ name: 'button', interactive: ['button'], focusTarget: 'self', stateIndicator: [] }),
  config({
    name: 'dialog',
    tier: 'engine',
    interactive: ['dialog-trigger', 'dialog-close'],
    focusTarget: 'self',
    stateIndicator: [{ slot: 'dialog-popup', paint: 'border' }],
  }),
  config({
    name: 'select',
    tier: 'engine',
    interactive: ['select-trigger', 'select-item'],
    focusTarget: 'self',
    stateIndicator: [
      { slot: 'select-popup', paint: 'border' },
      { slot: 'select-item', state: '[data-selected]', paint: 'highlight' },
    ],
  }),
  config({
    name: 'tooltip',
    tier: 'engine',
    interactive: ['tooltip-trigger'],
    focusTarget: 'self',
    stateIndicator: [{ slot: 'tooltip-popup', paint: 'border' }],
  }),
];

/** The rule whose selector starts with `selector`, from its selector line to its closing brace. */
function ruleOf(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`no rule starts with ${selector}`);
  return css.slice(start, css.indexOf('}', start) + 1);
}

describe('baseCss', () => {
  test('the W1 manifests give the rules in gen/COMPONENT-JSON.md', () => {
    const css = baseCss(W1, LAYERS);
    expect(css.startsWith(`${LAYERS}\n`)).toBe(true);
    expect(css).toContain(`  :where(
    .nz-button,
    .nz-dialog-close,
    .nz-dialog-trigger,
    .nz-select-item,
    .nz-select-trigger,
    .nz-tooltip-trigger
  ):is(:focus-visible, [data-focus-visible]) {
    outline: var(--nz-border-width-focus) solid var(--nz-border-focus);
    outline-offset: 2px;
  }`);
    expect(css).toContain(`  :where(
    .nz-button,
    .nz-dialog-close,
    .nz-dialog-trigger,
    .nz-select-item,
    .nz-select-trigger,
    .nz-tooltip-trigger
  ) {
    touch-action: pan-x pan-y pinch-zoom;
  }`);
    expect(css).toContain(`  @media (forced-colors: active) {
    :where(.nz-dialog-popup, .nz-select-popup, .nz-tooltip-popup) {
      border: 1px solid CanvasText;
    }
    :where(.nz-select-item)[data-selected] {
      background: Highlight;
      color: HighlightText;
      forced-color-adjust: none;
    }
  }`);
  });

  test('carries the fixed rules of §8.5', () => {
    const css = baseCss(W1, LAYERS);
    expect(ruleOf(css, '[data-focus-inset]:is(')).toContain('outline-offset: -2px;');
    expect(ruleOf(css, '[data-focus-inset]:has(> input:focus-visible)')).toContain(
      'outline-offset: -2px;',
    );
    expect(ruleOf(css, '.nz-hit-target {')).toContain('position: relative;');
    expect(css).toContain(`  @media (pointer: coarse) {
    .nz-hit-target:not([data-hit-inset])::after {
      content: '';
      position: absolute;
      inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));
    }
  }`);
    expect(
      ruleOf(css, "[data-nz-touch-targets='always'] .nz-hit-target:not([data-hit-inset])::after"),
    ).toContain('inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));');
    expect(ruleOf(css, ":dir(rtl) [data-mirror='rtl']")).toContain('scale: -1 1;');
    expect(ruleOf(css, 'html {')).toContain(
      'scroll-padding-block: var(--nz-layout-top-inset, 0px)',
    );
  });

  test('each focusTarget mode gets its own selector, and within slots get no touch-action', () => {
    const css = baseCss(
      [
        config({
          name: 'input',
          tier: 'client',
          interactive: ['input', 'input-group'],
          focusTarget: { input: 'self', 'input-group': 'within' },
        }),
        config({
          name: 'segmented-control',
          tier: 'client',
          interactive: ['segmented-control-item'],
          focusTarget: 'nested-input',
          stateIndicator: [
            {
              slot: 'segmented-control-item',
              state: ':has(> input:checked)',
              paint: 'outline',
            },
          ],
        }),
      ],
      LAYERS,
    );
    expect(css).toContain(':where(.nz-input):is(:focus-visible, [data-focus-visible]) {');
    expect(css).toContain(
      ':where(.nz-segmented-control-item):is(:has(> input:focus-visible), [data-focus-visible]) {',
    );
    expect(css).toContain(':where(.nz-input-group):focus-within {');
    expect(ruleOf(css, ':where(.nz-input, .nz-segmented-control-item) {')).toContain(
      'touch-action: pan-x pan-y pinch-zoom;',
    );
    expect(css).not.toMatch(/nz-input-group[^{]*\{\s*touch-action/);
    expect(ruleOf(css, ':where(.nz-segmented-control-item):has(> input:checked)')).toContain(
      'outline: 2px solid Highlight;',
    );
  });

  test('groups indicators by state and paint, each vendor pseudo-element in a rule of its own', () => {
    const css = baseCss(
      [
        config({
          name: 'switch',
          tier: 'client',
          stateIndicator: [
            { slot: 'switch-input', paint: 'border' },
            { slot: 'switch-input', state: ':checked', paint: 'fill' },
            { slot: 'switch-thumb', paint: 'mark' },
          ],
        }),
        config({
          name: 'checkbox',
          tier: 'client',
          stateIndicator: [
            { slot: 'checkbox-input', paint: 'border' },
            { slot: 'checkbox-input', state: ':checked', paint: 'fill' },
          ],
        }),
        config({
          name: 'progress-bar',
          stateIndicator: [
            { slot: 'progress-bar-track', state: '::-webkit-progress-value', paint: 'fill' },
            { slot: 'progress-bar-track', state: '::-moz-progress-bar', paint: 'fill' },
          ],
        }),
      ],
      LAYERS,
    );
    expect(ruleOf(css, ':where(.nz-checkbox-input, .nz-switch-input) {')).toContain(
      'border: 1px solid CanvasText;',
    );
    expect(ruleOf(css, ':where(.nz-checkbox-input, .nz-switch-input):checked')).toContain(
      'background: Highlight;',
    );
    expect(ruleOf(css, ':where(.nz-switch-thumb) {')).toContain('background: CanvasText;');
    expect(css).toContain(':where(.nz-progress-bar-track)::-moz-progress-bar {');
    expect(css).toContain(':where(.nz-progress-bar-track)::-webkit-progress-value {');
    // no interactive slots: no focus or touch-action rule
    expect(css).not.toContain('touch-action');
    expect(css).not.toContain('outline: var(--nz-border-width-focus)');
  });

  test('without indicators there is no forced-colours block', () => {
    expect(baseCss([config({ name: 'button', interactive: ['button'] })], LAYERS)).not.toContain(
      'forced-colors',
    );
  });

  test('breaks a long suffix the way oxfmt does', () => {
    const css = baseCss([config({ name: 'x', interactive: [`x-${'a'.repeat(50)}`] })], LAYERS);
    expect(css).toContain(`  :where(.nz-x-${'a'.repeat(50)}):is(
    :focus-visible,
    [data-focus-visible]
  ) {`);
  });

  test('ends with the utilities, in their own layer after the floor', () => {
    const css = baseCss(W1, LAYERS);
    const utilities = css.indexOf('@layer nz.utilities {');
    expect(utilities).toBeGreaterThan(css.indexOf('@layer nz.base {'));
    expect(ruleOf(css.slice(utilities), '.nz-visually-hidden {')).toContain(
      'clip-path: inset(50%);',
    );
  });

  test('is deterministic whatever the manifest order', () => {
    expect(baseCss(W1.toReversed(), LAYERS)).toBe(baseCss(W1, LAYERS));
  });
});

function copyFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'nz-base-'));
  cpSync(fixture, root, { recursive: true });
  mkdirSync(join(root, 'contracts'), { recursive: true });
  writeFileSync(join(root, 'contracts', 'layers.css'), `/* the order */\n${LAYERS}\n`);
  roots.push(root);
  return root;
}

describe('generateBaseCss', () => {
  test('reads every component.json and the layer statement from the repo root', () => {
    const root = copyFixture();
    const { file, content } = generateBaseCss(root);
    expect(file).toBe(join(root, 'packages', 'react', 'styles', 'base.css'));
    expect(content.split('\n')[0]).toBe(LAYERS);
    expect(content).toContain('.nz-select-trigger');
    expect(content).toContain(':where(.nz-select-item)[data-selected]');
  });

  test('fails on an invalid component.json', () => {
    const root = copyFixture();
    writeFileSync(
      join(root, 'packages', 'react', 'src', 'button', 'component.json'),
      '{ "name": "button", "tier": "server", "interactive": ["nope"] }\n',
    );
    expect(() => generateBaseCss(root)).toThrow(/button\/component\.json: "interactive": "nope"/);
  });
});

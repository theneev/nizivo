import { describe, expect, test } from 'vitest';
import { extractCss, hookDescription } from '../api/css.ts';
import type { CssApiFile } from '../api/schema.ts';

const chip = { name: 'chip', prefixes: ['chip'], variants: { tone: ['neutral', 'critical'] } };
const tokens = new Set([
  '--nz-bg-critical',
  '--nz-bg-neutral',
  '--nz-opacity-muted',
  '--nz-space-1',
  '--nz-text-primary',
]);

function extract(css: string, source?: string): CssApiFile {
  const { file, errors } = extractCss({
    code: css,
    filename: 'dist/css/chip.css',
    entry: './css/chip.css',
    component: chip,
    tokens,
    source,
  });
  expect(errors).toEqual([]);
  if (file === undefined) throw new Error('no file');
  return file;
}

function problems(css: string): string[] {
  return extractCss({
    code: css,
    filename: 'dist/css/chip.css',
    entry: './css/chip.css',
    component: chip,
    tokens,
  }).errors;
}

describe('extractCss', () => {
  test('a private fallback lists every declaration of the private, one per selector', () => {
    const file = extract(`@layer nz.tokens, nz.components;
@layer nz.components{.nz-chip{--_nz-chip-bg:var(--nz-bg-neutral);background:var(--nz-chip-bg,var(--_nz-chip-bg))}.nz-chip[data-tone=critical],.nz-chip[data-open]{--_nz-chip-bg:var(--nz-bg-critical)}}`);
    expect(file.layers).toEqual(['nz.components']);
    expect(file.hooks).toEqual([
      {
        fallback: {
          kind: 'private',
          name: '--_nz-chip-bg',
          values: [
            { conditions: [], selector: '.nz-chip', value: 'var(--nz-bg-neutral)', when: {} },
            {
              conditions: [],
              selector: '.nz-chip[data-open]',
              value: 'var(--nz-bg-critical)',
              when: { 'data-open': '' },
            },
            {
              conditions: [],
              selector: '.nz-chip[data-tone="critical"]',
              value: 'var(--nz-bg-critical)',
              when: { 'data-tone': 'critical' },
            },
          ],
        },
        name: '--nz-chip-bg',
        reads: [{ conditions: [], property: 'background', selector: '.nz-chip', slot: 'chip' }],
      },
    ]);
    expect(file.tokens).toEqual(['--nz-bg-critical', '--nz-bg-neutral']);
  });

  test('flattens nesting and records the enclosing conditions, outermost first', () => {
    const file = extract(
      `@layer nz.components{.nz-chip{@media (hover:hover){@supports (color:red){&:hover>.nz-chip-icon{color:var(--nz-chip-icon-fg,var(--nz-text-primary))}}}}}`,
    );
    expect(file.hooks[0]?.reads).toEqual([
      {
        conditions: ['@media (hover: hover)', '@supports (color: red)'],
        property: 'color',
        selector: '.nz-chip:hover > .nz-chip-icon',
        slot: 'chip-icon',
      },
    ]);
    expect(file.classes).toEqual(['nz-chip', 'nz-chip-icon']);
  });

  test('describes token, literal, expression and alias fallbacks, and runtime reads', () => {
    const file = extract(`@layer nz.components{.nz-chip{
      gap:var(--nz-chip-gap,var(--nz-space-1));
      max-inline-size:var(--nz-chip-max,12rem);
      padding:var(--nz-chip-padding,calc(var(--nz-space-1) * 2));
      color:var(--nz-chip-fg,var(--nz-chip-color,var(--nz-text-primary)));
      min-inline-size:var(--nz-trigger-width);
    }}`);
    const fallbacks = Object.fromEntries(file.hooks.map((hook) => [hook.name, hook.fallback]));
    expect(fallbacks).toEqual({
      '--nz-chip-color': { kind: 'token', name: '--nz-text-primary' },
      '--nz-chip-fg': { kind: 'hook', name: '--nz-chip-color' },
      '--nz-chip-gap': { kind: 'token', name: '--nz-space-1' },
      '--nz-chip-max': { kind: 'literal', value: '12rem' },
      '--nz-chip-padding': {
        kind: 'expression',
        tokens: ['--nz-space-1'],
        value: 'calc(var(--nz-space-1) * 2)',
      },
    });
    expect(file.runtime).toEqual(['--nz-trigger-width']);
  });

  test('a rule with a selector list gives one read per selector', () => {
    const file = extract(
      `@layer nz.components{.nz-chip,.nz-chip-text:is(.nz-chip-a,.nz-chip-b){gap:var(--nz-chip-gap,var(--nz-space-1))}}`,
    );
    expect(file.hooks[0]?.reads.map((read) => [read.selector, read.slot])).toEqual([
      ['.nz-chip', 'chip'],
      // classes inside :is() are not the element's own: the slot is the compound's class
      ['.nz-chip-text:is(.nz-chip-a, .nz-chip-b)', 'chip-text'],
    ]);
    expect(file.classes).toEqual(['nz-chip', 'nz-chip-a', 'nz-chip-b', 'nz-chip-text']);
  });

  test('collects the tokens keyframes read', () => {
    const file = extract(
      `@layer nz.components{@keyframes nz-chip-pulse{50%{opacity:var(--nz-opacity-muted)}}.nz-chip{animation:nz-chip-pulse 1s}}`,
    );
    expect(file.tokens).toEqual(['--nz-opacity-muted']);
    expect(file.hooks).toEqual([]);
  });

  test('fails when one hook is read with two fallbacks, or without one', () => {
    expect(
      problems(
        `@layer nz.components{.nz-chip{gap:var(--nz-chip-gap,var(--nz-space-1))}.nz-chip-text{gap:var(--nz-chip-gap,0)}}`,
      ),
    ).toEqual([
      'dist/css/chip.css: hook --nz-chip-gap is read with different fallbacks: var(--nz-space-1) | 0 (§8.4 rule 1)',
    ]);
    expect(problems(`@layer nz.components{.nz-chip{gap:var(--nz-chip-gap)}}`)).toEqual([
      'dist/css/chip.css: hook --nz-chip-gap is read without a fallback (§8.4 rule 1)',
    ]);
  });

  test('fails on a name that is neither a token, a runtime variable, a hook nor a private', () => {
    expect(problems(`@layer nz.components{.nz-chip{color:var(--nz-colour-primary)}}`)).toEqual([
      'dist/css/chip.css: --nz-colour-primary is not a token, a runtime variable, a hook or a private',
    ]);
  });

  test('a hook read by an element without an nz-* class has no slot, so it fails', () => {
    expect(
      problems(
        `@layer nz.components{.nz-chip>svg{fill:var(--nz-chip-icon,var(--nz-text-primary))}}`,
      ),
    ).toEqual([
      'dist/css/chip.css: --nz-chip-icon is read by ".nz-chip > svg", whose subject has no nz-* class to name its slot',
    ]);
  });

  test('a shared stylesheet has no hooks: a hook-shaped name is unknown there', () => {
    const { errors } = extractCss({
      code: `@layer nz.base{.nz-chip{gap:var(--nz-chip-gap,0)}}`,
      filename: 'dist/css/base.css',
      entry: './css/base.css',
      tokens,
    });
    expect(errors).toEqual([
      'dist/css/base.css: --nz-chip-gap is not a token, a runtime variable, a hook or a private',
    ]);
  });
});

describe('hookDescription', () => {
  const source = `@layer nz.components {
  .nz-chip {
    display: flex;
    /**
     * The gap,
     * in one step
     */
    gap: var(--nz-chip-gap, var(--nz-space-1));
    /** far away */

    padding: var(--nz-chip-padding, 0);
    color: red; /** trailing */
    background: var(--nz-chip-bg, var(--_nz-chip-bg));
    /* Figma pads 14 px: a note for maintainers */
    margin: var(--nz-chip-margin, 0);
    /**/
    outline-offset: var(--nz-chip-offset, 0);
  }
  /** the rule, not a declaration */
  .nz-chip-text {
    font: var(--nz-chip-font, var(--nz-font-body-m));
  }
}`;

  test('takes the doc comment directly above the first declaration that reads the hook', () => {
    expect(hookDescription(source, '--nz-chip-gap')).toBe('The gap, in one step');
  });

  test('never publishes a plain comment: it is a note for maintainers', () => {
    expect(hookDescription(source, '--nz-chip-margin')).toBeUndefined();
    expect(hookDescription(source, '--nz-chip-offset')).toBeUndefined();
  });

  test('ignores a comment separated by a blank line, a trailing comment and a rule comment', () => {
    expect(hookDescription(source, '--nz-chip-padding')).toBeUndefined();
    expect(hookDescription(source, '--nz-chip-bg')).toBeUndefined();
    expect(hookDescription(source, '--nz-chip-font')).toBeUndefined();
    expect(hookDescription(source, '--nz-chip-missing')).toBeUndefined();
  });

  test('flows into the hook table', () => {
    const file = extract(
      `@layer nz.components{.nz-chip{gap:var(--nz-chip-gap,var(--nz-space-1))}}`,
      source,
    );
    expect(file.hooks[0]?.description).toBe('The gap, in one step');
  });
});

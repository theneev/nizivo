// The Lightning CSS build, its guard and the emitted-CSS vocabulary check (ARCHITECTURE.md §4.1 L3,
// §21.1 exit criterion 3), run on source strings: the same functions scripts/build-css.ts runs.
import { readFileSync } from 'node:fs';
import {
  componentOf,
  expectedLayers,
  layerStatement,
  loadComponents,
  loadVocabulary,
  tokensFile,
} from '@nizivo/stylelint-config/contract';
import { describe, expect, test } from 'vitest';
import { compileCss, guardCss } from '../../scripts/css/compile';
import { checkEmitted, declaredProperties } from '../../scripts/css/emitted';
import { cssExportProblems } from '../../scripts/css/exports';
import { SHIPPED } from './shipped';

const LAYERS = layerStatement();
const components = loadComponents();
const vocabulary = loadVocabulary();
const options = { layerStatement: LAYERS, layer: 'nz.components' };

/** What @nizivo/tokens publishes (the package is built before these tests run). */
const published = (subpath: string): string => {
  const file = tokensFile(subpath);
  if (file === undefined) throw new Error(`@nizivo/tokens does not list ${subpath}`);
  return readFileSync(file, 'utf8');
};
const realCustomMedia = published('./custom-media.css')
  .match(/@custom-media\s[^;]+;/g)
  ?.join('\n');
const realTokens = declaredProperties(published('./tokens.css'), 'tokens.css');

const layered = (css: string, layer = 'nz.components'): string =>
  `${LAYERS}\n@layer ${layer} {\n${css}\n}\n`;

const compile = (css: string, layer = 'nz.components', customMedia?: string) =>
  compileCss(css, 'x.css', { layerStatement: LAYERS, layer, customMedia });

describe('compileCss', () => {
  test.each(SHIPPED)('builds %s with no problems against the real tokens', (path, source) => {
    const layers = expectedLayers(`/x/${path}`);
    const { code, problems } = compileCss(source, path, {
      layerStatement: LAYERS,
      layer: layers,
      customMedia: realCustomMedia,
    });
    expect(problems).toEqual([]);
    expect(code.split('\n')[0]).toBe(LAYERS);
    expect(code.split('\n')[1]).toMatch(
      new RegExp(`^@layer ${(layers[0] ?? '').replace('.', '\\.')}\\{`),
    );
    expect(code.split('\n')).toHaveLength(3);
    const component = componentOf(`/x/dist/css/${path.split('/').at(-1) ?? ''}`, components);
    expect(
      checkEmitted(code, path, { vocabulary, components, component, tokens: realTokens }),
    ).toEqual([]);
  });

  test('keeps the floor native: nesting, light-dark() and @starting-style are not lowered', () => {
    const { code, problems } = compile(
      layered(
        '.nz-x { --_nz-x-c: light-dark(red, blue); color: var(--_nz-x-c); &:hover { color: red; } @starting-style { opacity: 0; } }',
      ),
    );
    expect(problems).toEqual([]);
    expect(code).toContain('light-dark(red,#00f)');
    expect(code).toContain('&:hover{color:red}');
    expect(code).toContain('@starting-style{opacity:0}');
  });

  test('is deterministic', () => {
    const [, source = ''] = SHIPPED[0] ?? [];
    expect(compile(source).code).toBe(compile(source).code);
  });

  test('requires the canonical layer statement on line 1', () => {
    expect(compile('@layer nz.components { .nz-x { color: red; } }').problems).toEqual([
      expect.stringContaining('line 1 must be the canonical layer statement'),
    ]);
  });

  test('substitutes custom media from @nizivo/tokens, and fails on an undefined one', () => {
    const css = layered('.nz-x { @media (--nz-sm) { color: red; } }');
    const built = compile(css, 'nz.components', '@custom-media --nz-sm (width >= 40rem);');
    expect(built.problems).toEqual([]);
    expect(built.code).toContain('@media (width>=40rem)');
    expect(built.code).not.toContain('custom-media');
    expect(compile(css).problems).toEqual([
      expect.stringMatching(/Lightning CSS failed \(line 3:.*--nz-sm is not defined/),
    ]);
  });

  test('reports what Lightning CSS could not keep, at its source line', () => {
    expect(compile(layered('.nz-x:hovr { color: red; }')).problems).toEqual([
      expect.stringMatching(/could not keep this \(line 3:\d+\).*'hovr' is not recognized/),
      ':hovr is not a selector the browser floor parses',
    ]);
    expect(compile(layered('@foo bar;')).problems).toContainEqual(
      expect.stringContaining('Unknown at rule: @foo'),
    );
  });
});

const guard = (body: string, layer = 'nz.components') =>
  compile(layered(body, layer), layer).problems;

describe('guardCss', () => {
  test.each([
    ['an unknown property', '.nz-x { colr: red; }', /"colr" is not a property/],
    ['a property beyond the floor', '.nz-x { field-sizing: content; }', /"field-sizing"/],
    [
      'a gated property under a condition on another property',
      '.nz-x { @supports (display: grid) { field-sizing: content; } }',
      /"field-sizing" is outside the browser floor/,
    ],
    [
      'a gated property under a negated condition',
      '.nz-x { @supports not (field-sizing: content) { field-sizing: content; } }',
      /"field-sizing" is outside the browser floor/,
    ],
    [
      'a modelled property beyond the floor',
      '.nz-x { view-transition-name: x; }',
      /outside the browser floor/,
    ],
    [
      'a function beyond the floor',
      '.nz-x { inline-size: anchor-size(width); }',
      /anchor-size\(\) is not a function/,
    ],
    ['an unknown function', '.nz-x { background: foo(1); }', /foo\(\) is not a function/],
    [
      'a pseudo-class beyond the floor',
      '.nz-x:open { color: red; }',
      /:open is outside the browser floor/,
    ],
    [
      'a pseudo-element beyond the floor',
      '.nz-x::details-content { color: red; }',
      /::details-content/,
    ],
    ['@scope', '@scope (.nz-x) { .nz-y { color: red; } }', /@scope is outside the browser floor/],
    ['a style query', '@container style(--x: 1) { .nz-x { color: red; } }', /style\(\) queries/],
    ['an empty value', '.nz-x { content: ; }', /"content" has an empty value/],
    ['an empty typed value', '.nz-x { color: ; }', /"color" has an empty value/],
    ['a nested layer', '@layer inner { .nz-x { color: red; } }', /nested @layer/],
  ])('fails on %s', (_, body, message) => {
    expect(guard(body).join('\n')).toMatch(message);
  });

  test('a vendor pseudo-element needs a rule of its own, which Lightning CSS splits out', () => {
    const { code, problems } = compile(layered('.nz-x::-moz-progress-bar, .nz-y { color: red; }'));
    expect(problems).toEqual([]);
    expect(code).toContain('.nz-y{color:red}.nz-x::-moz-progress-bar{color:red}');
    expect(
      guardCss(
        `${LAYERS}\n@layer nz.components{.nz-x::-moz-progress-bar,.nz-y{color:red}}`,
        'x.css',
        options,
      ),
    ).toEqual([expect.stringContaining('needs a rule of its own')]);
  });

  test('accepts a gated property inside @supports for that property, at any depth', () => {
    expect(
      guard(
        '.nz-x { resize: vertical; @supports (field-sizing: content) { field-sizing: content; min-block-size: 3lh; } } @supports (field-sizing: content) { .nz-y { field-sizing: content; } }',
      ),
    ).toEqual([]);
  });

  test('accepts vendor pseudo-elements and floor properties Lightning CSS does not model', () => {
    expect(
      guard(
        '.nz-x::-moz-progress-bar { background: red; } .nz-x::-webkit-progress-value { background: red; } .nz-x { touch-action: pan-x pan-y pinch-zoom; transition-behavior: allow-discrete; forced-color-adjust: none; }',
      ),
    ).toEqual([]);
  });

  test('fails on output in another layer, unlayered output and lowered light-dark()', () => {
    const wrongLayer = guardCss(
      `${LAYERS}\n@layer nz.utilities{.nz-x{color:red}}`,
      'x.css',
      options,
    );
    expect(wrongLayer).toEqual([expect.stringContaining('writes into @layer nz.components only')]);
    const base = { ...options, layer: ['nz.base', 'nz.utilities'] };
    expect(guardCss(`${LAYERS}\n@layer nz.utilities{.nz-x{color:red}}`, 'x.css', base)).toEqual([]);
    expect(guardCss(`${LAYERS}\n@layer nz.components{.nz-x{color:red}}`, 'x.css', base)).toEqual([
      expect.stringContaining('writes into @layer nz.base or @layer nz.utilities only'),
    ]);
    const unlayered = guardCss(`${LAYERS}\n.nz-x{color:red}`, 'x.css', options);
    expect(unlayered).toEqual([expect.stringContaining('top-level @style outside')]);
    const lowered = guardCss(
      `${LAYERS}\n@layer nz.components{.nz-x{--lightningcss-light:initial;color:var(--lightningcss-light,red)}}`,
      'x.css',
      options,
    );
    expect(lowered).toContainEqual(expect.stringContaining('--lightningcss-*'));
    expect(guardCss('@layer nz.components{}', 'x.css', options)).toContainEqual(
      expect.stringContaining('line 1 is not the canonical layer statement'),
    );
  });
});

describe('checkEmitted', () => {
  const button = components.get('button');
  const check = (body: string, tokens?: ReadonlySet<string>) =>
    checkEmitted(compile(layered(body)).code, 'button.css', {
      vocabulary,
      components,
      component: button,
      tokens,
    });

  test('accepts the vocabulary, manifest values, hooks with a fallback and runtime variables', () => {
    expect(
      check(
        ".nz-button[data-variant='primary'][data-size='sm'][data-pending] { --_nz-button-bg: var(--nz-bg-surface); background: var(--nz-button-bg, var(--_nz-button-bg)); inline-size: var(--nz-trigger-width); } [data-nz-theme='dark'] .nz-button-icon[data-slot='button-icon'] { color: red; }",
        new Set(['--nz-bg-surface']),
      ),
    ).toEqual([]);
  });

  test.each([
    ['a class outside nz-*', '.button { color: red; }', /class \.button is outside/],
    [
      'a data-* name outside the vocabulary',
      '.nz-button[data-hovered] { color: red; }',
      /"data-hovered" is not in/,
    ],
    [
      'a value outside the vocabulary',
      ".nz-button[data-side='start'] { color: red; }",
      /not a value of "data-side"/,
    ],
    [
      'a value outside the manifest',
      ".nz-button[data-variant='ghost'] { color: red; }",
      /button\/component.json/,
    ],
    [
      'a value on a presence attribute',
      ".nz-button[data-open='1'] { color: red; }",
      /presence attribute/,
    ],
    [
      'native overlay state',
      '.nz-button:popover-open { color: red; }',
      /:popover-open is native overlay state/,
    ],
    ['[open]', '.nz-button[open] { color: red; }', /\[open\] is native overlay state/],
    [
      '[open] beside, not on, a disclosure part',
      '.nz-accordion-item > .nz-button[open] { color: red; }',
      /\[open\] is native overlay state/,
    ],
    ['a var() outside --nz-*', '.nz-button { color: var(--brand); }', /not a Nizivo variable/],
    ['a primitive', '.nz-button { color: var(--nz-p-green-700); }', /private primitive/],
    ['an undeclared private', '.nz-button { color: var(--_nz-button-fg); }', /never declared/],
  ])('fails on %s', (_, body, message) => {
    expect(check(body).join('\n')).toMatch(message);
  });

  test('checks token names only when tokens.css is available', () => {
    const body = '.nz-button { color: var(--nz-text-primry); background: var(--nz-button-bg); }';
    expect(check(body)).toEqual([]);
    expect(check(body, new Set(['--nz-text-primary']))).toEqual([
      expect.stringContaining('"--nz-text-primry" is not a token'),
      expect.stringContaining('hook "--nz-button-bg" must be read with a fallback'),
    ]);
  });

  test('declaredProperties lists the custom properties a tokens.css declares', () => {
    const names = declaredProperties(
      "@layer nz.tokens{:root{--nz-bg-surface:#fff}[data-nz-theme='dark']{--nz-scheme-inverse:light}@media (prefers-reduced-motion:reduce){:root{--nz-duration-fast:0ms}}}",
      'tokens.css',
    );
    expect([...names].toSorted()).toEqual([
      '--nz-bg-surface',
      '--nz-duration-fast',
      '--nz-scheme-inverse',
    ]);
  });
});

describe('cssExportProblems', () => {
  const { exports }: { exports: Record<string, unknown> } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const written = SHIPPED.map(([path]) => (path.split('/').at(-1) ?? '').replace(/\.css$/, ''));

  test('every shipped stylesheet has an exports entry, and every ./css entry a stylesheet', () => {
    expect(written).toContain('base');
    expect(cssExportProblems(exports, written)).toEqual([]);
  });

  test('fails when a hand-written entry such as ./css/base.css is dropped', () => {
    const dropped = Object.fromEntries(
      Object.entries(exports).filter(([key]) => key !== './css/base.css'),
    );
    expect(cssExportProblems(dropped, written)).toEqual([
      expect.stringContaining('dist/css/base.css has no package.json exports entry'),
    ]);
  });

  test('fails on an entry whose stylesheet the build did not write', () => {
    const extra = { ...exports, './css/gone.css': './dist/css/gone.css' };
    expect(cssExportProblems(extra, written)).toEqual([
      expect.stringContaining(
        '"./css/gone.css" → ./dist/css/gone.css, which the build did not write',
      ),
    ]);
  });
});

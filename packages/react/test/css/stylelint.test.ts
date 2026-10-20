// The contract rules of @nizivo/stylelint-config (ARCHITECTURE.md §8.4), each with passing and
// failing fixtures. Each case runs its one rule on a stylesheet named like a real one.
import config from '@nizivo/stylelint-config';
import { layerStatement } from '@nizivo/stylelint-config/contract';
import stylelint from 'stylelint';
import { describe, expect, test } from 'vitest';
import { SHIPPED } from './shipped';

const LAYERS = layerStatement();
const BUTTON = '/repo/packages/react/src/button/button.css';
const BASE = '/repo/packages/react/styles/base.css';
const TEXT = '/repo/packages/react/src/text/text.css';
const CARD = '/repo/packages/react/src/card/card.css';
const SPARKLINE = '/repo/packages/charts/src/sparkline/sparkline.css';
const TOKENS_PACKAGE = '/repo/packages/tokens/src/tokens.css';

/** Wraps rules in the file's layer, after the canonical statement. */
const layered = (css: string, layer = 'nz.components'): string =>
  `${LAYERS}\n@layer ${layer} {\n${css}\n}\n`;

interface Case {
  code: string;
  file?: string;
}

async function problems(rule: string, options: unknown, { code, file = BUTTON }: Case) {
  const result = await stylelint.lint({
    code,
    codeFilename: file,
    config: { plugins: config.plugins ?? [], rules: { [rule]: options } },
  });
  return (result.results[0]?.warnings ?? []).map((warning) => warning.text);
}

interface Suite {
  options: unknown;
  accept: Case[];
  reject: [Case, RegExp][];
}

const SUITES: [string, Suite][] = [];
function suite(rule: string, options: unknown, accept: Case[], reject: [Case, RegExp][]): void {
  SUITES.push([rule, { options, accept, reject }]);
}

suite(
  'nizivo/layer-discipline',
  true,
  [
    { code: layered('.nz-button { color: red; }') },
    { code: `${LAYERS}\n/* comment */\n@layer nz.components {}\n@layer nz.components {}\n` },
    { code: layered('.nz-hit-target { position: relative; }', 'nz.base'), file: BASE },
    { code: layered('.nz-visually-hidden { overflow: hidden; }', 'nz.utilities'), file: BASE },
  ],
  [
    [
      { code: '@layer nz.components { .nz-button { color: red; } }\n' },
      /canonical layer statement/,
    ],
    [
      { code: '@layer nz.base, nz.tokens;\n@layer nz.components {}\n' },
      /canonical layer statement/,
    ],
    [
      { code: `${LAYERS}\n.nz-button { color: red; }\n` },
      /wrap every rule in @layer nz.components/,
    ],
    [{ code: layered('', 'nz.utilities') }, /writes into @layer nz.components only/],
    [
      { code: layered('', 'nz.components'), file: BASE },
      /writes into @layer nz.base or @layer nz.utilities only/,
    ],
    [{ code: layered('@layer inner { .nz-button {} }') }, /no nested @layer/],
  ],
);

suite(
  'nizivo/no-public-declarations',
  true,
  [
    { code: layered('.nz-button { --_nz-button-bg: red; }') },
    { code: ':root { --nz-bg-surface: red; }', file: TOKENS_PACKAGE },
    // the shared surface variable is declared by Card's sheet alone (M42 item 6)
    { code: layered('.nz-card { --nz-surface: var(--_nz-card-bg); }'), file: CARD },
  ],
  [
    [{ code: layered('.nz-button { --nz-button-bg: red; }') }, /"--nz-button-bg" is public/],
    [{ code: layered('.nz-button { --nz-surface: red; }') }, /"--nz-surface" is public/],
    [
      { code: layered('.nz-sparkline { --nz-surface: red; }'), file: SPARKLINE },
      /"--nz-surface" is public/,
    ],
    [{ code: layered('.x .nz-button { --nz-bg-surface: red; }') }, /declare a --_nz-\* private/],
  ],
);

const tokens = { tokens: ['--nz-bg-surface', '--nz-space-2', '--nz-text-primary'] };
suite(
  'nizivo/custom-property-reads',
  [true, tokens],
  [
    { code: layered('.nz-button { background: var(--nz-bg-surface); }') },
    {
      code: layered(
        '.nz-button { --_nz-button-bg: var(--nz-bg-surface); background: var(--nz-button-bg, var(--_nz-button-bg)); }',
      ),
    },
    { code: layered('.nz-button { inline-size: var(--nz-trigger-width); }') },
    { code: layered('.nz-button { gap: var(--nz-space-2, 0.5rem); }') },
    { code: ':root { color: var(--nz-p-green-700); }', file: TOKENS_PACKAGE },
    // the shared surface variable is read anywhere, with a fallback (M42 item 6)
    { code: layered('.nz-button { background: var(--nz-surface, var(--nz-bg-surface)); }') },
    {
      code: layered(
        '.nz-sparkline-halo { stroke: var(--nz-sparkline-halo, var(--nz-surface, var(--nz-bg-surface))); }',
      ),
      file: SPARKLINE,
    },
  ],
  [
    [{ code: layered('.nz-button { color: var(--brand); }') }, /not a Nizivo variable/],
    [
      { code: layered('.nz-button { background: var(--nz-surface); }') },
      /"--nz-surface" is undefined outside card: read it with a fallback/,
    ],
    [{ code: layered('.nz-button { color: var(--nz-p-green-700); }') }, /private primitive/],
    [{ code: layered('.nz-button { color: var(--nz-bg-surfce); }') }, /not a token/],
    [
      { code: layered('.nz-button { color: var(--nz-button-fg); }') },
      /must be read with a fallback/,
    ],
    [
      { code: layered('.nz-button { color: var(--nz-select-bg, red); }') },
      /not a token in @nizivo\/tokens, a runtime variable or a hook of this component/,
    ],
    [{ code: layered('.nz-button { color: var(--_nz-button-fg); }') }, /never declared/],
    // --nz-text-* is a token family, so in text.css a misspelt token is not taken for a hook
    [
      { code: layered('.nz-text { color: var(--nz-text-primry, red); }'), file: TEXT },
      /not a token in @nizivo\/tokens/,
    ],
  ],
);

suite(
  'nizivo/no-theme-logic',
  true,
  [
    { code: layered('.nz-button { color: var(--nz-text-primary); }') },
    { code: ':root { --nz-bg: light-dark(#fff, #000); }', file: TOKENS_PACKAGE },
  ],
  [
    [{ code: layered('.nz-button { color: light-dark(#fff, #000); }') }, /light-dark\(\) belongs/],
    [
      { code: layered('@media (prefers-color-scheme: dark) { .nz-button { color: red; } }') },
      /prefers-color-scheme belongs/,
    ],
    [{ code: layered("[data-nz-theme='dark'] .nz-button { color: red; }") }, /\[data-nz-theme\]/],
  ],
);

suite(
  'nizivo/vocabulary',
  true,
  [
    { code: layered('.nz-button[data-pending] {}') },
    { code: layered("&[data-side='top'] {}") },
    { code: layered('.nz-button[data-variant=\'primary\'][data-size="sm"] {}') },
    { code: layered(".nz-x[data-slot='select-trigger'] {}") },
    { code: layered("[data-nz-touch-targets='always'] .nz-hit-target {}"), file: BASE },
    { code: layered('@keyframes nz-button-spin { to { rotate: 1turn; } }') },
  ],
  [
    [{ code: layered('.nz-button[data-hovered] {}') }, /"data-hovered" is not in contracts/],
    [{ code: layered(".nz-button[data-open='true'] {}") }, /presence attribute/],
    [{ code: layered(".nz-button[data-side='start'] {}") }, /not a value of "data-side"/],
    [
      { code: layered(".nz-button[data-variant='ghost'] {}") },
      /not a value of "data-variant" in button\/component.json/,
    ],
    [{ code: layered(".nz-button[data-variant^='prim'] {}") }, /with "=" only/],
    [{ code: layered(".nz-x[data-slot='nope-trigger'] {}") }, /not a slot of any component/],
    [{ code: layered('.nz-button[data-nz-brand] {}') }, /reserved/],
    [{ code: layered('.nz-dialog-popup:modal {}') }, /:modal is native overlay state/],
    [{ code: layered('.nz-dialog-popup::backdrop {}') }, /::backdrop is native overlay state/],
    [{ code: layered('.nz-dialog-popup[open] {}') }, /\[open\] is native overlay state/],
  ],
);

suite(
  'nizivo/spring-pairing',
  true,
  [
    {
      code: layered(
        '.nz-x { transition: scale var(--nz-duration-spring) var(--nz-easing-spring), opacity var(--nz-duration-spring) var(--nz-easing-enter); }',
      ),
    },
    {
      code: layered(
        '.nz-x { transition: translate var(--nz-duration-spring-soft) var(--nz-easing-spring-soft); }',
      ),
    },
  ],
  [
    [
      {
        code: layered(
          '.nz-x { transition: scale var(--nz-duration-base) var(--nz-easing-spring); }',
        ),
      },
      /must travel with var\(--nz-duration-spring\)/,
    ],
    [
      {
        code: layered(
          '.nz-x { transition: scale var(--nz-duration-spring) var(--nz-easing-spring-soft); }',
        ),
      },
      /--nz-duration-spring-soft/,
    ],
    [
      {
        code: layered(
          '.nz-x { transition: opacity var(--nz-duration-spring) var(--nz-easing-spring); }',
        ),
      },
      /only transform, scale, translate or rotate, not "opacity"/,
    ],
    [
      { code: layered('.nz-x { transition-timing-function: var(--nz-easing-spring); }') },
      /in a `transition` item/,
    ],
    [
      { code: layered('.nz-x { --_nz-x-ease: var(--nz-easing-spring); }') },
      /in a `transition` item/,
    ],
  ],
);

suite(
  'nizivo/infinite-animation',
  true,
  [
    { code: layered('.nz-x { animation: nz-x-spin var(--nz-duration-spin) linear infinite; }') },
    {
      code: layered(
        '.nz-x { animation-duration: var(--nz-duration-pulse); animation-iteration-count: infinite; }',
      ),
    },
    { code: layered('.nz-x { animation: nz-x-in var(--nz-duration-base) 2; }') },
  ],
  [
    [
      { code: layered('.nz-x { animation: nz-x-spin var(--nz-duration-slow) linear infinite; }') },
      /--nz-duration-pulse/,
    ],
    [
      {
        code: layered('.nz-x { animation-duration: 1s; animation-iteration-count: infinite; }'),
      },
      /--nz-duration-spin/,
    ],
  ],
);

suite(
  'nizivo/font-size-floor',
  true,
  [
    { code: layered('.nz-x { font: var(--nz-font-label-s); }') },
    { code: layered('.nz-x { font-size: var(--nz-font-body-s-font-size); }') },
    { code: layered('.nz-x { font-size: 0.875rem; }') },
    { code: layered('.nz-x { font-size: 14px; }') },
    { code: layered('.nz-x { font-size: 1em; }') },
    { code: layered('.nz-x { font-size: inherit; }') },
    { code: layered('.nz-x { font: 500 0.875rem/1.4 var(--nz-font-family-sans); }') },
  ],
  [
    [{ code: layered('.nz-x { font-size: 11px; }') }, /below the 12 px/],
    [{ code: layered('.nz-x { font-size: 0.6875rem; }') }, /below the 12 px/],
    [{ code: layered('.nz-x { font-size: 0.75rem; }') }, /12 px only through/],
    [{ code: layered('.nz-x { font-size: 12px; }') }, /12 px only through/],
    [{ code: layered('.nz-x { font-size: 0.8em; }') }, /can fall below/],
    [{ code: layered('.nz-x { font-size: x-small; }') }, /can fall below/],
    [{ code: layered('.nz-x { font-size: 2vw; }') }, /write a font size in rem/],
    [{ code: layered('.nz-x { font-size: clamp(0.7rem, 1vw, 1rem); }') }, /hides the size/],
    [{ code: layered('.nz-x { font: 500 11px/1.4 sans-serif; }') }, /below the 12 px/],
    [{ code: layered('.nz-x { font: small-caption; }') }, /system font/],
  ],
);

suite(
  'keyframes-name-pattern',
  config.rules?.['keyframes-name-pattern'],
  [{ code: layered('@keyframes nz-x-spin { to { rotate: 1turn; } }') }],
  [[{ code: layered('@keyframes spin { to { rotate: 1turn; } }') }, /keyframe names are global/]],
);

suite(
  'declaration-no-important',
  true,
  [{ code: layered('.nz-x { color: red; }') }],
  [[{ code: layered('.nz-x { color: red !important; }') }, /!important/]],
);

describe.each(SUITES)('%s', (rule, { options, accept, reject }) => {
  test.each(accept.map((item) => [item.code, item] as const))('accepts %s', async (_, item) => {
    expect(await problems(rule, options, item)).toEqual([]);
  });
  test.each(reject.map(([item, message]) => [item.code, item, message] as const))(
    'rejects %s',
    async (_, item, message) => {
      const found = await problems(rule, options, item);
      expect(found.length).toBeGreaterThan(0);
      expect(found.join('\n')).toMatch(message);
    },
  );
});

describe('the shared config', () => {
  test.each(SHIPPED)('passes on %s', async (path, code) => {
    const result = await stylelint.lint({
      code,
      codeFilename: `/repo/packages/react/${path}`,
      config,
    });
    expect(result.results[0]?.warnings.map((warning) => warning.text)).toEqual([]);
  });
});

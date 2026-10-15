// The convenience sheet's assembly (ARCHITECTURE.md §5.2, scripts/css/styles.ts), on small inputs.
// test/built/styles.test.ts checks the real dist/styles.css against the real tokens.css and dist/css.
import { layerStatement } from '@nizivo/stylelint-config/contract';
import { describe, expect, test } from 'vitest';
import {
  assembleStyles,
  stylesExport,
  stylesOrder,
  type BuiltSheet,
} from '../../scripts/css/styles';

const LAYERS = layerStatement();
const TOKENS = `/* header */\n\n${LAYERS}\n@layer nz.tokens {\n  :root { --nz-x: 1px; }\n}\n`;
const sheet = (name: string, extra: Partial<BuiltSheet> = {}): BuiltSheet => ({
  name,
  code: `${LAYERS}\n@layer nz.components{.nz-${name}{color:red}}\n`,
  component: true,
  ...extra,
});
const BASE: BuiltSheet = {
  name: 'base',
  code: `${LAYERS}\n@layer nz.base{:where(.nz-x){outline:0}}\n`,
  component: false,
};

describe('styles.css', () => {
  const sheets = [sheet('tooltip'), BASE, sheet('button'), sheet('menu')];
  const css = assembleStyles(LAYERS, TOKENS, sheets);

  test('line 1 is the canonical layer statement', () => {
    expect(css.split('\n')[0]).toBe(LAYERS);
  });

  test('then tokens.css byte for byte, then base.css, then the components by name', () => {
    expect(css).toBe(
      [
        LAYERS,
        '\n',
        TOKENS,
        BASE.code,
        ...['button', 'menu', 'tooltip'].map((n) => sheet(n).code),
      ].join(''),
    );
    expect(css.slice(LAYERS.length + 1, LAYERS.length + 1 + TOKENS.length)).toBe(TOKENS);
  });

  test('a part with no final newline gets one, and nothing else changes', () => {
    const bare = TOKENS.trimEnd();
    expect(assembleStyles(LAYERS, bare, [BASE])).toBe(`${LAYERS}\n${bare}\n${BASE.code}`);
  });

  test('unstable components and other styles/ sheets (reset.css) stay out', () => {
    const order = stylesOrder([
      BASE,
      sheet('reset', { component: false }),
      sheet('date-range-picker', { unstable: true }),
      sheet('button'),
    ]).map((s) => s.name);
    expect(order).toEqual(['base', 'button']);
  });

  test('there is no styles.css without base.css', () => {
    expect(() => assembleStyles(LAYERS, TOKENS, [sheet('button')])).toThrow(/needs base\.css/);
  });
});

describe('the ./styles.css exports entry', () => {
  test('absent or a wrong target is a problem, the right one nothing', () => {
    expect(stylesExport({})).toEqual({
      problem: expect.stringContaining('no package.json exports entry'),
    });
    expect(stylesExport({ './styles.css': './dist/css/styles.css' })).toEqual({
      problem: expect.stringContaining('expected "./dist/styles.css"'),
    });
    expect(stylesExport({ './styles.css': './dist/styles.css' })).toEqual({});
  });
});

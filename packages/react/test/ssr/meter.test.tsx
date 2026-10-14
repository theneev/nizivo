import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { Meter } from '../../src/meter/meter';
import { MeterExample } from '../../src/meter/meter.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Meter is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/meter/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Meter markup and semantics', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  test('a labelled native <meter> with its ranges; the shown value is hidden', () => {
    const html = renderToString(<Meter label="Plan storage" value={86} high={80} optimum={0} />);
    const id = /<span id="([^"]+)" class="nz-meter-label"/.exec(html)?.[1];
    expect(id).toBeDefined();
    expect(html).toMatch(/^<div data-slot="meter" data-tone="brand" class="nz-meter">/);
    expect(html).toContain(
      '<span class="nz-meter-value" data-slot="meter-value" aria-hidden="true">86%</span>',
    );
    expect(html).toContain(
      `<meter class="nz-meter-track" data-slot="meter-track" min="0" max="100" value="86" high="80" optimum="0" aria-labelledby="${id}"></meter>`,
    );
    expect(errors).not.toHaveBeenCalled();
  });

  test('value is clamped to min…max; the percentage is of the range; valueText replaces it', () => {
    const html = renderToString(<Meter aria-label="Score" value={7} min={5} max={9} />);
    expect(html).toContain('aria-hidden="true">50%</span>');
    expect(html).toContain('min="5" max="9" value="7" aria-label="Score"');
    expect(renderToString(<Meter aria-label="Score" value={12} min={5} max={9} />)).toContain(
      'value="9"',
    );
    const used = renderToString(<Meter label="Used" value={310} max={500} valueText="310 / 500" />);
    expect(used).toContain('aria-hidden="true">310 / 500</span>');
    expect(used).toContain('aria-valuetext="310 / 500"');
  });

  test('non-finite input never reaches an attribute', () => {
    const html = renderToString(
      <Meter aria-label="x" value={Number.NaN} max={Number.POSITIVE_INFINITY} low={Number.NaN} />,
    );
    expect(html).not.toMatch(/NaN|Infinity|low=/);
    expect(html).toContain('min="0" max="100" value="0"');
    expect(errors).not.toHaveBeenCalled();
  });

  test('the example renders without warnings', () => {
    expect(renderToString(<MeterExample />).match(/<meter /g)).toHaveLength(3);
    expect(errors).not.toHaveBeenCalled();
  });
});

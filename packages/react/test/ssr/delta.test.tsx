import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { Delta } from '../../src/delta/delta';
import { DeltaExample } from '../../src/delta/delta.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Delta is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/delta/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Delta markup', () => {
  test('a rise: success tone, signed percent, the comparison visually hidden', () => {
    expect(renderToString(<Delta value={0.124} comparison="vs last week" />)).toBe(
      '<span data-slot="delta" data-tone="success" class="nz-delta">' +
        '<span class="nz-delta-value" data-slot="delta-value">+12.4%</span>' +
        '<span class="nz-visually-hidden"> vs last week</span></span>',
    );
  });

  test('the direction is in the text, not only the colour', () => {
    const down = renderToString(<Delta value={-0.031} />);
    expect(down).toContain('data-tone="critical"');
    expect(down).toContain('>-3.1%</span>');
    const flat = renderToString(<Delta value={0} />);
    expect(flat).toContain('data-tone="neutral"');
    expect(flat).toContain('>0%</span>');
  });

  test('tone overrides the derived colour; format replaces the default but keeps the sign', () => {
    expect(renderToString(<Delta value={0.08} tone="critical" />)).toContain(
      'data-tone="critical"',
    );
    const euros = renderToString(
      <Delta value={1250} format={{ style: 'currency', currency: 'EUR' }} locale="de-DE" />,
    );
    expect(euros).toContain(
      `>${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' }).format(1250)}</span>`,
    );
  });

  test('the icon slot is decorative', () => {
    const html = renderToString(<Delta value={0.1} icon={<svg />} />);
    expect(html).toContain(
      '<span class="nz-delta-icon" data-slot="delta-icon" aria-hidden="true"><svg></svg></span>',
    );
  });

  test('render keeps the part data-slot and tone over the element', () => {
    const html = renderToString(
      <Delta value={-0.2} render={<strong data-tone="success" title="Refunds" />} />,
    );
    expect(html).toMatch(
      /^<strong data-tone="critical" title="Refunds" data-slot="delta" class="nz-delta">/,
    );
  });

  test('the example renders', () => {
    expect(renderToString(<DeltaExample />).match(/data-slot="delta"/g)).toHaveLength(5);
  });
});

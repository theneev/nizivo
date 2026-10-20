import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { serverRender, underReactServer, withDispatcher } from '../helpers/rsc';
import { NumberValueExample } from '../../src/number-value/number-value.example';
import { formatNumber, NumberValue } from '../../src/number-value/number-value';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('NumberValue is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/number-value/number-value.tsx');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the example renders with the react-server build of React', async () => {
    const {
      loaded: { NumberValueExample: Example },
      react,
    } = await underReactServer(() => import('../../src/number-value/number-value.example'));
    const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example())));
    expect(tree).toContain('"data-slot":"number-value"');
  });
});

describe('NumberValue markup', () => {
  test('a <data> element: the raw value for machines, the Intl text for people', () => {
    expect(renderToString(<NumberValue value={48290} />)).toBe(
      '<data data-slot="number-value" value="48290" class="nz-number-value">48,290</data>',
    );
  });

  test('format and locale are Intl options; formatNumber is the same text', () => {
    const euro = { style: 'currency', currency: 'EUR' } as const;
    const text = new Intl.NumberFormat('de-DE', euro).format(1250);
    expect(formatNumber(1250, euro, 'de-DE')).toBe(text);
    expect(renderToString(<NumberValue value={1250} format={euro} locale="de-DE" />)).toContain(
      `value="1250" class="nz-number-value">${text}</data>`,
    );
    expect(formatNumber(0.032, { style: 'percent', maximumFractionDigits: 1 })).toBe('3.2%');
    expect(formatNumber(1234.5)).toBe('1,234.5');
  });

  test('render keeps the slot and receives the formatted text', () => {
    expect(renderToString(<NumberValue value={7} render={<span data-slot="x" />} />)).toBe(
      '<span data-slot="number-value" value="7" class="nz-number-value">7</span>',
    );
    expect(
      renderToString(
        <NumberValue
          value={0.5}
          format={{ style: 'percent' }}
          render={(props, state) => <b {...props} title={state.text} />}
        />,
      ),
    ).toContain('title="50%"');
  });

  test('the example renders', () => {
    expect(renderToString(<NumberValueExample />).match(/data-slot="number-value"/g)).toHaveLength(
      5,
    );
  });
});

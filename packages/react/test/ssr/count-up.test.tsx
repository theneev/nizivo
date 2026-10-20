// CountUp (ARCHITECTURE.md §13.3, §13.4 `@nizivo/react/motion`; Figma 04 §5): the one client leaf of
// the dashboard set. The server HTML is the FINAL formatted value in NumberValue's own <data> element,
// so a page without JavaScript, a crawler and the first paint all show the real number, and swapping
// NumberValue for CountUp keeps the element. Counting, reduced motion and layout shift run in a real
// browser: test/browser/count-up.spec.tsx.
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { CountUp } from '../../src/motion/count-up.client';
import { CountUpExample } from '../../src/motion/motion.example';
import { formatNumber, NumberValue } from '../../src/number-value/number-value';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/motion/count-up.client.tsx', import.meta.url).pathname,
    exports: ['CountUp', 'useCountUp'],
  },
];

const VOCABULARY = new Set(
  Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
);

/** The opening tag of the root element. */
const root = (html: string): string => /^<data[^>]*>/.exec(html)?.[0] ?? '';

describe('module graph', () => {
  test('the ./motion subpath: one client module, its own; NumberValue and the helpers are server-safe; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/motion/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/motion/count-up.client.tsx',
    ]);
    expect(modules).toContain('src/number-value/number-value.tsx');
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, the leaf as a client reference', () => {
  test('the entry loads; the example crosses the boundary with serialisable props only', async () => {
    const {
      loaded: [entry, example],
      react,
    } = await underReactServer(
      () =>
        Promise.all([import('../../src/motion/index'), import('../../src/motion/motion.example')]),
      CLIENT,
    );
    expect(Object.keys(entry).toSorted()).toEqual(['CountUp', 'useCountUp']);
    for (const Example of Object.values(example)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('CountUp');
      expect(unserialisable(boundaries)).toEqual([]);
    }
  });
});

describe('SSR markup', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  test('the final value: aria-hidden digits, the same text visually hidden, in a <data value>', () => {
    const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
    expect(renderToString(<CountUp value={48290} format={usd} />)).toBe(
      '<data data-slot="count-up" value="48290" class="nz-number-value nz-count-up">' +
        '<span class="nz-count-up-value" data-slot="count-up-value" aria-hidden="true">$48,290</span>' +
        '<span class="nz-visually-hidden nz-count-up-label">$48,290</span></data>',
    );
    // never a live region: the final value is what assistive tech reads, once
    expect(renderToString(<CountUp value={1} />)).not.toMatch(/aria-live|role="status"/);
    expect(errors).not.toHaveBeenCalled();
  });

  test('`from` and `duration` change nothing in the server HTML', () => {
    const plain = renderToString(<CountUp value={12500} locale="de-DE" />);
    expect(
      renderToString(<CountUp value={12500} locale="de-DE" from={1000} duration={2000} />),
    ).toBe(plain);
    expect(plain).toContain('>12.500</span>');
  });

  test("NumberValue's element: the same tag, value and class, and the same text", () => {
    const cases: Array<[number, Intl.NumberFormatOptions | undefined, string | undefined]> = [
      [48290, { style: 'currency', currency: 'USD' }, 'en-US'],
      [1234567.891, undefined, 'de-DE'],
      [0.124, { style: 'percent', maximumFractionDigits: 1 }, 'fr-FR'],
      [98765, { notation: 'compact' }, 'ja-JP'],
      [-3200.5, { style: 'currency', currency: 'INR' }, 'hi-IN'],
      [4321, undefined, 'ar-EG'],
    ];
    for (const [value, format, locale] of cases) {
      const number = renderToString(<NumberValue value={value} format={format} locale={locale} />);
      const count = renderToString(<CountUp value={value} format={format} locale={locale} />);
      const text = formatNumber(value, format, locale);
      expect(number).toBe(
        `<data data-slot="number-value" value="${value}" class="nz-number-value">${text}</data>`,
      );
      expect(root(count)).toBe(
        `<data data-slot="count-up" value="${value}" class="nz-number-value nz-count-up">`,
      );
      expect(count).toContain(`aria-hidden="true">${text}</span>`);
      expect(count).toContain(`nz-count-up-label">${text}</span>`);
    }
  });

  test('className, rest props and ref target the root; render composes it with the state', () => {
    expect(root(renderToString(<CountUp value={3} className="mine" id="x" />))).toBe(
      '<data data-slot="count-up" id="x" value="3" class="nz-number-value nz-count-up mine">',
    );
    const html = renderToString(
      <CountUp
        value={7}
        render={(props, state) => <span {...props} title={`${state.value} ${state.text}`} />}
      />,
    );
    expect(html).toMatch(
      /^<span data-slot="count-up" value="7" class="nz-number-value nz-count-up" title="7 7">/,
    );
  });

  test('the example renders without errors and stays inside the vocabulary', () => {
    const html = renderToString(<CountUpExample />);
    expect(errors).not.toHaveBeenCalled();
    const names = [...html.matchAll(/\s(data-[a-z0-9-]+)=/g)].map((match) => match[1]);
    expect(names.filter((name) => name !== undefined && !VOCABULARY.has(name))).toEqual([]);
    expect(html).toContain('>$48,290</span>');
  });
});

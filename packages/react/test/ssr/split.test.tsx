import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import { Split } from '../../src/split/index';
import { StickyBar } from '../../src/sticky-bar/index';
import { StickyBarExample } from '../../src/sticky-bar/sticky-bar.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Split and StickyBar are server-safe', () => {
  test("no 'use client' module in either subpath's graph", () => {
    for (const entry of ['src/split/index.ts', 'src/sticky-bar/index.ts']) {
      const { modules } = graph(SRC, entry);
      expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    }
  });
});

describe('Split markup', () => {
  test('a row of main and aside, wide by default; render names the aside', () => {
    const html = renderToString(
      <Split.Root>
        <Split.Main>Main</Split.Main>
        <Split.Aside render={<aside aria-label="Goals" />}>Aside</Split.Aside>
      </Split.Root>,
    );
    expect(html).toBe(
      '<div data-slot="split" data-aside="wide" class="nz-split"><div data-slot="split-main" class="nz-split-main">Main</div><aside aria-label="Goals" data-slot="split-aside" class="nz-split-aside">Aside</aside></div>',
    );
    expect(renderToString(<Split.Root aside="narrow" />)).toContain('data-aside="narrow"');
  });
});

describe('StickyBar markup', () => {
  test('the summary, then the actions; no summary, the actions alone', () => {
    const html = renderToString(<StickyBarExample />);
    expect(html).toMatch(/^<div data-slot="sticky-bar" class="nz-sticky-bar">/);
    expect(html.indexOf('sticky-bar-summary')).toBeLessThan(html.indexOf('sticky-bar-actions'));
    expect(
      renderToString(
        <StickyBar>
          <button type="button">Add</button>
        </StickyBar>,
      ),
    ).toBe(
      '<div data-slot="sticky-bar" class="nz-sticky-bar"><div class="nz-sticky-bar-actions" data-slot="sticky-bar-actions"><button type="button">Add</button></div></div>',
    );
  });
});

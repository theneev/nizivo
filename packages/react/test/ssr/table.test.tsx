import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { Table } from '../../src/table/index';
import { TableOrdersExample, TableSortExample } from '../../src/table/table.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Table is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/table/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Table markup', () => {
  test('a native table: no grid role, header cells scoped to their column', () => {
    const html = renderToString(<TableOrdersExample />);
    expect(html).toMatch(
      /^<div data-slot="table-container" class="nz-table-container"><table data-slot="table" class="nz-table">/,
    );
    expect(html).not.toContain('role=');
    expect(html).toContain(
      '<caption data-slot="table-caption" class="nz-table-caption nz-visually-hidden">Recent orders</caption>',
    );
    expect(html).toContain(
      '<th data-slot="table-head" scope="col" class="nz-table-head">Order</th>',
    );
    expect(html).toContain(
      '<th data-slot="table-head" data-numeric="" scope="col" class="nz-table-head">Total</th>',
    );
  });

  test('an interactive row carries data-interactive and its stretched link', () => {
    const html = renderToString(<TableOrdersExample />);
    expect(html).toContain('<tr data-slot="table-row" data-interactive="" class="nz-table-row">');
    expect(html).toContain(
      '<a data-slot="table-row-link" href="#order-1042" class="nz-table-row-link">#<!-- -->1042</a>',
    );
    expect(html).toContain('<time dateTime="2026-10-14T09:12:00Z">Oct 14, 09:12</time>');
  });

  test('sort: aria-sort and data-sort on the <th>; the button is the link; selected rows', () => {
    const html = renderToString(<TableSortExample />);
    expect(html).toContain(
      'data-sort="descending" data-numeric="" aria-sort="descending" scope="col"',
    );
    expect(html).toContain('<a data-slot="table-sort-button" href="?sort=price"');
    expect(html).not.toMatch(/<a [^>]*type="button"/);
    expect(html).toContain('<tr data-slot="table-row" data-selected="" class="nz-table-row">');
    expect(html).toContain(
      '<th data-slot="table-head" scope="row" class="nz-table-head">Linen apron</th>',
    );
  });

  test('a SortButton without render is a <button type="button">', () => {
    const html = renderToString(<Table.SortButton>Total</Table.SortButton>);
    expect(html).toMatch(
      /^<button data-slot="table-sort-button" type="button" class="nz-table-sort-button nz-hit-target">Total<span/,
    );
  });

  test('a container with a label is a named, focusable scroll region; without one, a plain box', () => {
    expect(renderToString(<Table.Container label="Orders" />)).toBe(
      '<div data-slot="table-container" role="region" aria-label="Orders" tabindex="0" class="nz-table-container"></div>',
    );
    expect(renderToString(<Table.Container />)).toBe(
      '<div data-slot="table-container" class="nz-table-container"></div>',
    );
  });
});

// DataView (ARCHITECTURE.md §16.2; D-db): server-safe, 0 KB of client JS. Module graph, RSC render
// with no client boundary, and markup: both presentations in the HTML, each marked with
// data-presentation, the list with an explicit list role, and interactive rows.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { DataView } from '../../src/data-view/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/data-view/index.ts');

  test("no 'use client' module; it imports only react: 0 KB under RSC", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('react-server build', () => {
  test('every example renders on the server with no client boundary', async () => {
    const { loaded, react } = await underReactServer(() =>
      Promise.all([
        import('../../src/data-view/index'),
        import('../../src/data-view/data-view.example'),
      ]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted()).toEqual([
      'DataView',
      'DataViewItem',
      'DataViewItemLink',
      'DataViewList',
      'DataViewRoot',
      'DataViewTable',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(2);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('both presentations are in the HTML; CSS shows one', () => {
    expect(
      renderToString(
        <DataView.Root>
          <DataView.Table>table</DataView.Table>
          <DataView.List aria-label="Orders">
            <DataView.Item>One</DataView.Item>
          </DataView.List>
        </DataView.Root>,
      ),
    ).toBe(
      '<div data-slot="data-view" class="nz-data-view">' +
        '<div data-slot="data-view-table" data-presentation="table" class="nz-data-view-table">table</div>' +
        '<ul data-slot="data-view-list" data-presentation="list" role="list" aria-label="Orders" class="nz-data-view-list">' +
        '<li data-slot="data-view-item" class="nz-data-view-item">One</li></ul></div>',
    );
  });

  test('an interactive row carries data-interactive and its stretched link', () => {
    expect(
      renderToString(
        <DataView.Item interactive>
          <DataView.ItemLink href="#o">Maya</DataView.ItemLink>
        </DataView.Item>,
      ),
    ).toBe(
      '<li data-slot="data-view-item" data-interactive="" class="nz-data-view-item">' +
        '<a data-slot="data-view-item-link" href="#o" class="nz-data-view-item-link">Maya</a></li>',
    );
  });

  test('render swaps the list for an ordered one', () => {
    expect(renderToString(<DataView.List render={<ol />} />)).toBe(
      '<ol data-slot="data-view-list" data-presentation="list" role="list" class="nz-data-view-list"></ol>',
    );
  });
});

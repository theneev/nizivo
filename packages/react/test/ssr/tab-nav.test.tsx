// TabNav (ARCHITECTURE.md §9.5, risk R11; figma/13 §4.5): the Tab visual on links, server-safe and
// 0 KB of client JS. Module graph, RSC render with no client boundary, and markup: a <nav> of links,
// aria-current="page" on the current one, no tab roles, any router's link through `render`.
import { createElement, type ComponentPropsWithRef, type JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { TabNav } from '../../src/tab-nav/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

/** A router link stand-in that renders an `<a>` and adds its own attribute. */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return (
    <a data-router="" {...props}>
      {children}
    </a>
  );
}

describe('module graph', () => {
  test('no client module and nothing but react: 0 KB under RSC', () => {
    const { modules, externals } = graph(SRC, 'src/tab-nav/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build', () => {
  test('the entry loads and every example renders on the server with no client boundary', async () => {
    const { loaded, react } = await underReactServer(() =>
      Promise.all([import('../../src/tab-nav/index'), import('../../src/tab-nav/tab-nav.example')]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted((a, b) => a.localeCompare(b))).toEqual([
      'TabNav',
      'TabNavLink',
      'TabNavRoot',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(2);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      const tree = withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries).toEqual([]);
      expect(JSON.stringify(tree)).toContain('"aria-current":"page"');
    }
  });
});

describe('markup', () => {
  test('a navigation landmark of links; the current one is aria-current="page"', () => {
    const html = renderToString(
      <TabNav.Root aria-label="Order status">
        <TabNav.Link href="?status=all" current>
          All orders
        </TabNav.Link>
        <TabNav.Link href="?status=unpaid" count={3}>
          Unpaid
        </TabNav.Link>
      </TabNav.Root>,
    );
    expect(html).toBe(
      '<nav data-slot="tab-nav" aria-label="Order status" class="nz-tab-nav">' +
        '<a data-slot="tab-nav-link" data-focus-inset="" href="?status=all" aria-current="page" class="nz-tab-nav-link">' +
        '<span class="nz-tab-nav-label" data-slot="tab-nav-label"><span class="nz-tab-nav-text">All orders</span>' +
        '<span class="nz-tab-nav-sizer" aria-hidden="true">All orders</span></span></a>' +
        '<a data-slot="tab-nav-link" data-focus-inset="" href="?status=unpaid" class="nz-tab-nav-link">' +
        '<span class="nz-tab-nav-label" data-slot="tab-nav-label"><span class="nz-tab-nav-text">Unpaid</span>' +
        '<span class="nz-tab-nav-sizer" aria-hidden="true">Unpaid</span></span>' +
        '<span class="nz-tab-nav-count" data-slot="tab-nav-count">3</span></a></nav>',
    );
    // navigation, not WAI-ARIA tabs
    expect(html).not.toMatch(/role="tab|aria-selected|tabindex/);
  });

  test("a router's link through render keeps the part's slot, class and aria-current", () => {
    const html = renderToString(
      <TabNav.Root aria-label="Customers">
        <TabNav.Link render={<Link href="/customers?segment=vip" />} current icon={<svg />}>
          VIP
        </TabNav.Link>
      </TabNav.Root>,
    );
    const link = /<a [^>]*>/.exec(html)?.[0] ?? '';
    expect(link).toContain('data-router=""');
    expect(link).toContain('href="/customers?segment=vip"');
    expect(link).toContain('data-slot="tab-nav-link"');
    expect(link).toContain('class="nz-tab-nav-link"');
    expect(link).toContain('aria-current="page"');
    expect(html).toContain(
      '<span class="nz-tab-nav-icon" data-slot="tab-nav-icon" aria-hidden="true"><svg></svg></span>',
    );
  });

  test('without current, a consumer aria-current passes through; current wins over it', () => {
    const html = renderToString(
      <TabNav.Root>
        <TabNav.Link href="#a" aria-current="location">
          A
        </TabNav.Link>
        <TabNav.Link href="#b" aria-current="false" current>
          B
        </TabNav.Link>
      </TabNav.Root>,
    );
    expect(html).toContain('href="#a" aria-current="location"');
    expect(html).toContain('href="#b" aria-current="page"');
  });

  test('render on the root keeps the slot; the function form receives the current state', () => {
    const html = renderToString(
      <TabNav.Root render={<nav aria-label="Views" title="views" />}>
        <TabNav.Link
          href="#a"
          current
          render={(props, state) => createElement('a', { ...props, title: String(state.current) })}
        >
          A
        </TabNav.Link>
      </TabNav.Root>,
    );
    expect(html).toMatch(/^<nav aria-label="Views" title="views" data-slot="tab-nav"/);
    expect(html).toContain('title="true"');
  });
});

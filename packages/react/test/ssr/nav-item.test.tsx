// NavItem (ARCHITECTURE.md §9.5; figma/06 §6.1): a sidebar destination, server-safe and 0 KB of
// client JS. Module graph, RSC render with no client boundary, and markup: a native link,
// aria-current="page" on the current one, any router's link through `render`, the count, a disabled
// item, and only vocabulary attributes on its parts. Keyboard and the collapsed rail run in a browser:
// test/browser/nav-item.spec.tsx.
import { createElement, type ComponentPropsWithRef, type JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { NavItem } from '../../src/nav-item/index';
import {
  NavItemCollapsedExample,
  NavItemExample,
  NavItemRouterExample,
} from '../../src/nav-item/nav-item.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const ALLOWED = new Set(
  Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
);

/** The `data-*` names on every documented part (an element with `data-slot`). */
function partAttributes(html: string): string[] {
  const names = new Set<string>();
  for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
    for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) if (name) names.add(name);
  }
  return [...names];
}

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
    const { modules, externals } = graph(SRC, 'src/nav-item/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build', () => {
  test('the entry loads and every example renders on the server with no client boundary', async () => {
    const { loaded, react } = await underReactServer(() =>
      Promise.all([
        import('../../src/nav-item/index'),
        import('../../src/nav-item/nav-item.example'),
      ]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry)).toEqual(['NavItem']);
    const list = Object.values(examples);
    expect(list).toHaveLength(3);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      const tree = withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries).toEqual([]);
      expect(JSON.stringify(tree)).toContain('"aria-current":"page"');
    }
  });
});

describe('markup', () => {
  test('a link with an icon, a label and a count; the current one is aria-current="page"', () => {
    const html = renderToString(
      <NavItem href="/orders" icon={<svg />} count={12} current>
        Orders
      </NavItem>,
    );
    expect(html).toBe(
      '<a data-slot="nav-item" href="/orders" aria-current="page" class="nz-nav-item">' +
        '<span class="nz-nav-item-icon" data-slot="nav-item-icon" aria-hidden="true"><svg></svg></span>' +
        '<span class="nz-nav-item-label" data-slot="nav-item-label">Orders</span>' +
        '<span class="nz-nav-item-count" data-slot="nav-item-count">12</span></a>',
    );
  });

  test('no count, no icon, not current: just the label', () => {
    const html = renderToString(<NavItem href="/products">Products</NavItem>);
    expect(html).toBe(
      '<a data-slot="nav-item" href="/products" class="nz-nav-item">' +
        '<span class="nz-nav-item-label" data-slot="nav-item-label">Products</span></a>',
    );
  });

  test('count 0 shows; null hides it', () => {
    expect(
      renderToString(
        <NavItem href="#" count={0}>
          A
        </NavItem>,
      ),
    ).toContain('data-slot="nav-item-count">0</span>');
    expect(
      renderToString(
        <NavItem href="#" count={null}>
          A
        </NavItem>,
      ),
    ).not.toContain('nav-item-count');
  });

  test("a router's link through render keeps the part's slot, class and aria-current", () => {
    const html = renderToString(
      <NavItem render={<Link href="/settings" />} current>
        Settings
      </NavItem>,
    );
    const link = /<a [^>]*>/.exec(html)?.[0] ?? '';
    expect(link).toContain('data-router=""');
    expect(link).toContain('href="/settings"');
    expect(link).toContain('data-slot="nav-item"');
    expect(link).toContain('class="nz-nav-item"');
    expect(link).toContain('aria-current="page"');
  });

  test('the function form receives the state; a consumer aria-current passes through', () => {
    const html = renderToString(
      <>
        <NavItem
          href="#a"
          current
          render={(props, state) => createElement('a', { ...props, title: String(state.current) })}
        >
          A
        </NavItem>
        <NavItem href="#b" aria-current="location">
          B
        </NavItem>
      </>,
    );
    expect(html).toContain('title="true"');
    expect(html).toContain('href="#b" aria-current="location"');
  });

  test('disabled: a link role with aria-disabled, no href, no render; current still marks it', () => {
    const html = renderToString(
      <NavItem href="/staff" target="_blank" render={<Link />} disabled current>
        Staff
      </NavItem>,
    );
    expect(html).toBe(
      '<span data-slot="nav-item" data-disabled="" role="link" aria-disabled="true" aria-current="page" class="nz-nav-item">' +
        '<span class="nz-nav-item-label" data-slot="nav-item-label">Staff</span></span>',
    );
  });

  test('every example stays inside the vocabulary', () => {
    for (const Example of [NavItemExample, NavItemRouterExample, NavItemCollapsedExample]) {
      const html = renderToString(<Example />);
      expect(partAttributes(html).filter((name) => !ALLOWED.has(name))).toEqual([]);
    }
  });

  test('the collapsed example sets the attribute the future Sidebar will set', () => {
    expect(renderToString(<NavItemCollapsedExample />)).toMatch(/<nav [^>]*data-collapsed=""/);
    expect(ALLOWED.has('data-collapsed')).toBe(true);
  });
});

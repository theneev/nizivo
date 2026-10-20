// Breadcrumb (Figma 755:998, figma/06 §6.9): server-safe, 0 KB of client JS. Module graph, RSC render
// with no client boundary, and markup: a named <nav> around an <ol>, links for every level but the
// current page (text, aria-current="page"), decorative separators, any router's link through
// `render`, and nothing collapsed.
import { createElement, type ComponentPropsWithRef, type JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { BreadcrumbItem, BreadcrumbRoot } from '../../src/breadcrumb/breadcrumb';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
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

const CHEVRON =
  /<svg class="nz-glyph nz-glyph-chevron"[^>]*aria-hidden="true"[^>]*><path d="m9 18 6-6-6-6"><\/path><\/svg>/;

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/breadcrumb/breadcrumb.tsx');

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
        import('../../src/breadcrumb/index'),
        import('../../src/breadcrumb/breadcrumb.example'),
      ]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).length).toBeGreaterThan(0);
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
  test("Figma's trail: a named landmark, an ordered list, links, then the current page as text", () => {
    const html = renderToString(
      <BreadcrumbRoot>
        <BreadcrumbItem href="/products">Products</BreadcrumbItem>
        <BreadcrumbItem href="/products/mugs">Mugs &amp; cups</BreadcrumbItem>
        <BreadcrumbItem current>Stoneware mug</BreadcrumbItem>
      </BreadcrumbRoot>,
    );
    expect(html).toMatch(
      /^<nav data-slot="breadcrumb" aria-label="Breadcrumb" class="nz-breadcrumb"><ol class="nz-breadcrumb-list" data-slot="breadcrumb-list">/,
    );
    const items = html.match(/<li class="nz-breadcrumb-item" data-slot="breadcrumb-item">/g);
    expect(items).toHaveLength(3);
    expect(html).toContain(
      '<a data-slot="breadcrumb-link" href="/products" class="nz-breadcrumb-link">Products</a>',
    );
    expect(html).toContain(
      '<a data-slot="breadcrumb-link" href="/products/mugs" class="nz-breadcrumb-link">Mugs &amp; cups</a>',
    );
    // Figma: "the last item has aria-current="page" and is not a link"
    expect(html).toContain(
      '<span class="nz-breadcrumb-current" data-slot="breadcrumb-current" aria-current="page">Stoneware mug</span>',
    );
    expect(html.match(/<a /g)).toHaveLength(2);
    // every separator is decorative and mirrors under RTL (the first is hidden by CSS)
    const separators = [
      ...html.matchAll(/<span class="nz-breadcrumb-separator"[^>]*>(.*?)<\/span>/g),
    ];
    expect(separators).toHaveLength(3);
    for (const [tag, glyph] of separators) {
      expect(tag).toContain(
        'data-slot="breadcrumb-separator" data-mirror="rtl" aria-hidden="true"',
      );
      expect(glyph).toMatch(CHEVRON);
    }
  });

  test("a router's link through render keeps the slot and class; the current item ignores render", () => {
    const html = renderToString(
      <BreadcrumbRoot>
        <BreadcrumbItem render={<Link href="/orders" />}>Orders</BreadcrumbItem>
        <BreadcrumbItem
          href="#1042"
          render={(props, state) => createElement('a', { ...props, title: String(state.current) })}
        >
          #1042
        </BreadcrumbItem>
        <BreadcrumbItem current render={<Link href="/never" />} className="mine">
          Refund
        </BreadcrumbItem>
      </BreadcrumbRoot>,
    );
    const link = /<a [^>]*data-router[^>]*>/.exec(html)?.[0] ?? '';
    expect(link).toContain('href="/orders"');
    expect(link).toContain('data-slot="breadcrumb-link"');
    expect(link).toContain('class="nz-breadcrumb-link"');
    expect(html).toContain('title="false"');
    expect(html).not.toContain('/never');
    expect(html).toContain('class="nz-breadcrumb-current mine"');
  });

  test("the root's separator replaces every chevron that an item does not set, unmirrored", () => {
    const html = renderToString(
      <BreadcrumbRoot separator="/" labels={{ nav: 'You are here' }}>
        <BreadcrumbItem href="/a">A</BreadcrumbItem>
        <BreadcrumbItem href="/b" separator="›">
          B
        </BreadcrumbItem>
        <BreadcrumbItem current>C</BreadcrumbItem>
      </BreadcrumbRoot>,
    );
    expect(html).toContain('aria-label="You are here"');
    expect(html).not.toMatch(CHEVRON);
    expect(html).not.toContain('data-mirror');
    expect(
      [...html.matchAll(/data-slot="breadcrumb-separator" aria-hidden="true">(.*?)<\/span>/g)].map(
        (match) => match[1],
      ),
    ).toEqual(['/', '›', '/']);
  });

  test('an aria-label wins over labels.nav; nothing collapses however deep the trail', () => {
    const levels = ['Home', 'Store', 'Catalogue', 'Products', 'Kitchen', 'Mugs', 'Stoneware'];
    const html = renderToString(
      <BreadcrumbRoot aria-label="Path" labels={{ nav: 'unused' }}>
        {levels.map((level) => (
          <BreadcrumbItem key={level} href={`/${level}`}>
            {level}
          </BreadcrumbItem>
        ))}
        <BreadcrumbItem current>Mug</BreadcrumbItem>
      </BreadcrumbRoot>,
    );
    expect(html).toContain('aria-label="Path"');
    expect(html).not.toContain('unused');
    expect(html.match(/<a /g)).toHaveLength(levels.length);
  });
});

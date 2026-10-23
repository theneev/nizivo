// Pagination (Figma 755:1007, figma/06 §6.10): server-safe link mode, 0 KB of client JS. Module graph,
// RSC render with no client boundary, the ellipsis rule, and markup: a named <nav>, a link per page
// from getHref, aria-current="page" on the current one, named previous/next links that are disabled
// (not hidden, not focusable) at the ends, a decorative ellipsis, and a router's link through
// renderLink.
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
import { Pagination, paginationSlots } from '../../src/pagination/pagination';

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

const href = (page: number): string => `?page=${page}`;

/** The visible slots between previous and next, as text: numbers, "…". */
function visible(html: string): string[] {
  return [
    ...html.matchAll(
      /<(?:a|span) [^>]*class="nz-pagination-(?:page|ellipsis)"[^>]*>([^<]*)<\/(?:a|span)>/g,
    ),
  ].map((match) => match[1] ?? '');
}

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/pagination/pagination.tsx');

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
        import('../../src/pagination/index'),
        import('../../src/pagination/pagination.example'),
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

/** The default slots of a 13-page set at `page`, as text. */
function at(page: number): string {
  return paginationSlots(page, 13)
    .map((slot) => (slot === 'ellipsis' ? '…' : String(slot)))
    .join(' ');
}

describe('the ellipsis rule', () => {
  test('defaults (1 sibling, 1 boundary): always 7 slots once there are more than 7 pages', () => {
    expect(at(1)).toBe('1 2 3 4 5 … 13');
    expect(at(4)).toBe('1 2 3 4 5 … 13');
    expect(at(5)).toBe('1 … 4 5 6 … 13');
    expect(at(7)).toBe('1 … 6 7 8 … 13');
    expect(at(9)).toBe('1 … 8 9 10 … 13');
    expect(at(10)).toBe('1 … 9 10 11 12 13');
    expect(at(13)).toBe('1 … 9 10 11 12 13');
    for (let page = 1; page <= 13; page += 1) expect(paginationSlots(page, 13)).toHaveLength(7);
  });

  test("Figma's drawing is siblingCount 0: 1 2 3 … 13", () => {
    expect(paginationSlots(1, 13, 0)).toEqual([1, 2, 3, 'ellipsis', 13]);
    expect(paginationSlots(7, 13, 0)).toEqual([1, 'ellipsis', 7, 'ellipsis', 13]);
  });

  test('a gap of one page shows the page, not "…"; short lists show every page', () => {
    expect(paginationSlots(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(paginationSlots(1, 1)).toEqual([1]);
    expect(paginationSlots(2, 2)).toEqual([1, 2]);
    expect(paginationSlots(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('out-of-range input is clamped', () => {
    expect(paginationSlots(99, 3)).toEqual([1, 2, 3]);
    expect(paginationSlots(-2, 0)).toEqual([1]);
    expect(paginationSlots(2.7, 4.2, 1.9, 1)).toEqual([1, 2, 3, 4]);
  });
});

describe('markup', () => {
  test("Figma's footer, page 1 of 13: summary, disabled previous, current page, links, next", () => {
    const html = renderToString(
      <Pagination page={1} totalPages={13} getHref={href} summary="Showing 1–20 of 248" />,
    );
    expect(html).toMatch(
      /^<nav data-slot="pagination" data-size="md" aria-label="Pagination" class="nz-pagination">/,
    );
    expect(html).toContain(
      '<p class="nz-pagination-summary" data-slot="pagination-summary">Showing 1–20 of 248</p>',
    );
    expect(html).toContain('<ul class="nz-pagination-list" data-slot="pagination-list">');
    expect(visible(html)).toEqual(['1', '2', '3', '4', '5', '…', '13']);
    expect(html).toContain(
      '<a href="?page=1" data-slot="pagination-page" class="nz-pagination-page" aria-label="Page 1" aria-current="page">1</a>',
    );
    expect(html).toContain(
      '<a href="?page=2" data-slot="pagination-page" class="nz-pagination-page" aria-label="Page 2">2</a>',
    );
    expect(html.match(/aria-current/g)).toHaveLength(1);
    // previous at the first page: still there, named, not a focusable link
    expect(html).toMatch(
      /<span class="nz-pagination-step nz-pagination-previous" data-slot="pagination-previous" role="link" aria-label="Previous page" aria-disabled="true" data-disabled="">/,
    );
    expect(html).toMatch(
      /<a href="\?page=2" data-slot="pagination-next" class="nz-pagination-step nz-pagination-next" aria-label="Next page" rel="next">/,
    );
    // the gap is decorative
    expect(html).toContain(
      '<li aria-hidden="true"><span class="nz-pagination-ellipsis" data-slot="pagination-ellipsis">…</span></li>',
    );
    // both steps carry the chevron, mirrored under RTL
    expect(
      html.match(
        /<span class="nz-pagination-icon" data-slot="pagination-icon" data-mirror="rtl" aria-hidden="true"><svg class="nz-glyph nz-glyph-chevron"/g,
      ),
    ).toHaveLength(2);
  });

  test('the last page disables next; previous links back with rel="prev"', () => {
    const html = renderToString(<Pagination page={13} totalPages={13} getHref={href} />);
    expect(html).toMatch(
      /<span [^>]*data-slot="pagination-next" role="link" aria-label="Next page" aria-disabled="true"/,
    );
    expect(html).toMatch(/<a href="\?page=12" data-slot="pagination-previous"[^>]*rel="prev"/);
    expect(html).not.toContain('nz-pagination-summary');
  });

  test('button mode (onPageChange): native buttons, the ends disabled, no href, no rel', () => {
    const html = renderToString(
      <Pagination page={1} totalPages={13} siblingCount={0} onPageChange={() => undefined} />,
    );
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('rel=');
    expect(html).toMatch(
      /<button type="button" class="nz-pagination-step nz-pagination-previous" data-slot="pagination-previous" aria-label="Previous page" disabled="" data-disabled="">/,
    );
    expect(html).toContain(
      '<button type="button" data-slot="pagination-page" class="nz-pagination-page" aria-label="Page 1" aria-current="page">1</button>',
    );
    expect(html).toMatch(/<button type="button" data-slot="pagination-next" class="[^"]*"[^>]*>/);
    // previous, 1, 2, 3, 13, next
    expect(html.match(/<button /g)).toHaveLength(6);
  });

  test('without getHref or onPageChange it says which to give', () => {
    expect(() => renderToString(createElement(Pagination, { page: 1, totalPages: 3 }))).toThrow(
      'Pagination needs getHref (links) or onPageChange',
    );
  });

  test('a single page: both steps disabled, one current page', () => {
    const html = renderToString(<Pagination page={1} totalPages={1} getHref={href} />);
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(visible(html)).toEqual(['1']);
  });

  test('renderLink: an element gets href from getHref; a function gets the link state', () => {
    const element = renderToString(
      <Pagination page={7} totalPages={13} siblingCount={0} getHref={href} renderLink={<Link />} />,
    );
    const links = element.match(/<a [^>]*>/g) ?? [];
    // previous, 1, 7, 13, next
    expect(links).toHaveLength(5);
    for (const link of links) expect(link).toContain('data-router=""');
    expect(element).toContain('href="?page=7"');
    expect(visible(element)).toEqual(['1', '…', '7', '…', '13']);

    const fn = renderToString(
      <Pagination
        page={2}
        totalPages={3}
        getHref={href}
        renderLink={(props, state) =>
          createElement('a', {
            ...props,
            'data-state': `${state.kind}:${state.page}:${String(state.current)}`,
          })
        }
      />,
    );
    expect([...fn.matchAll(/data-state="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'previous:1:false',
      'page:1:false',
      'page:2:true',
      'page:3:false',
      'next:3:false',
    ]);
  });

  test('labels, locale, size, custom icons and the root render', () => {
    const html = renderToString(
      <Pagination
        page={1200}
        totalPages={1500}
        getHref={href}
        size="sm"
        locale="de-DE"
        labels={{ nav: 'Seiten', previous: 'Zurück', next: 'Weiter', page: 'Seite {page}' }}
        previousIcon={<i>p</i>}
        nextIcon={<i>n</i>}
        render={<nav data-extra="" />}
      />,
    );
    expect(html).toMatch(
      /^<nav data-extra="" data-slot="pagination" data-size="sm" aria-label="Seiten"/,
    );
    expect(html).toContain('aria-label="Seite 1.200" aria-current="page">1.200</a>');
    expect(html).toContain('aria-label="Zurück"');
    expect(html).toContain('aria-label="Weiter"');
    expect(html).toContain(
      '<span class="nz-pagination-icon" data-slot="pagination-icon" aria-hidden="true"><i>p</i></span>',
    );
    expect(html).not.toContain('nz-glyph-chevron');
  });
});

// RankedList (Figma 752:444, figma/04 §4.6): server-safe, 0 KB of client JS. Module graph, RSC render
// with no client boundary, and markup: Card's surface, a heading that names an <ol>, rows of label,
// NumberValue and an aria-hidden bar whose width is a percentage attribute of the leader (no inline
// style), "View all" as a real link, and the §16.5 contract (attributes, aria-busy with static hidden
// text, no live region, the reserved rows).
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
import {
  RankedListAction,
  RankedListItem,
  RankedListRoot,
} from '../../src/ranked-list/ranked-list';

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

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

/** Every bar's width attribute, in row order. */
const widths = (html: string): string[] =>
  [...html.matchAll(/<rect class="nz-ranked-list-fill" width="([^"]+)"/g)].map((m) => m[1] ?? '');

function channels(extra: Record<string, unknown> = {}): JSX.Element {
  return (
    <RankedListRoot title="Top channels" format={USD} {...extra}>
      <RankedListItem label="Online store" value={64120} />
      <RankedListItem label="Instagram Shop" value={21804} />
      <RankedListItem label="Wholesale" value={18240} />
      <RankedListItem label="Pop-up market" value={9312} />
      <RankedListItem label="Marketplace" value={6050} />
    </RankedListRoot>
  );
}

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/ranked-list/ranked-list.tsx');

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
        import('../../src/ranked-list/index'),
        import('../../src/ranked-list/ranked-list.example'),
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
      expect(JSON.stringify(tree)).toContain('"data-slot":"ranked-list"');
    }
  });
});

describe('ready', () => {
  test("Figma's Top channels: Card's surface, a heading naming the ordered list, five rows", () => {
    const html = renderToString(channels());
    expect(html).toMatch(/^<div data-slot="ranked-list" class="nz-card nz-ranked-list">/);
    const id =
      /<h3 class="nz-ranked-list-title" data-slot="ranked-list-title" id="([^"]+)">Top channels<\/h3>/.exec(
        html,
      )?.[1];
    expect(id).toBeDefined();
    expect(html).toContain(
      `<ol class="nz-ranked-list-list" data-slot="ranked-list-list" aria-labelledby="${id ?? ''}">`,
    );
    expect(
      html.match(/<li data-slot="ranked-list-item" class="nz-ranked-list-item">/g),
    ).toHaveLength(5);
    expect(html).toContain(
      '<span class="nz-ranked-list-label" data-slot="ranked-list-label">Online store</span>' +
        '<data data-slot="number-value" value="64120" class="nz-number-value nz-ranked-list-value">$64,120</data>',
    );
    // relative to the leader (Figma: 332/113/93/50/30 of a 330 track, the leader clipped to 100 %)
    expect(widths(html)).toEqual(['100%', '34.005%', '28.447%', '14.523%', '9.435%']);
    // decorative bars, no inline style anywhere (CSP Profile B), no status attributes
    expect(
      html.match(
        /<svg class="nz-ranked-list-bar" data-slot="ranked-list-bar"[^>]*aria-hidden="true"/g,
      ),
    ).toHaveLength(5);
    expect(html).not.toMatch(
      /style=|aria-busy|data-loading|data-empty|data-error|aria-live|role="status"/,
    );
  });

  test('an explicit max on the list, or on one item, replaces the leader', () => {
    expect(widths(renderToString(channels({ max: 128240 }))).slice(0, 2)).toEqual([
      '50%',
      '17.002%',
    ]);
    const html = renderToString(
      <RankedListRoot>
        <RankedListItem label="A" value={50} />
        <RankedListItem label="B" value={50} max={200} />
        <RankedListItem label="C" value={-5} />
      </RankedListRoot>,
    );
    expect(widths(html)).toEqual(['100%', '25%', '0%']);
    // no title: no header and no aria-labelledby
    expect(html).not.toContain('nz-ranked-list-header');
    expect(html).not.toContain('aria-labelledby');
  });

  test('format and locale cascade to items unless the item sets its own', () => {
    const html = renderToString(
      <RankedListRoot locale="de-DE" format={{ style: 'currency', currency: 'EUR' }}>
        <RankedListItem label="A" value={1234.5} />
        <RankedListItem label="B" value={0.25} format={{ style: 'percent' }} locale="en-US" />
      </RankedListRoot>,
    );
    const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
      1234.5,
    );
    expect(euro).toMatch(/^1\.234,50\s€$/u);
    expect(html).toContain(`>${euro}</data>`);
    expect(html).toContain('>25%</data>');
  });

  test('"View all" is a real link (24 px in CSS) and a router link goes in through render', () => {
    const html = renderToString(
      channels({
        titleLevel: 2,
        action: <RankedListAction render={<Link href="/channels" />}>View all</RankedListAction>,
      }),
    );
    expect(html).toContain('<h2 class="nz-ranked-list-title"');
    expect(html).toMatch(
      /<a data-router="" href="\/channels" data-slot="ranked-list-action" class="nz-ranked-list-action"><span class="nz-ranked-list-action-text" data-slot="ranked-list-action-text">View all<\/span><\/a>/,
    );
  });

  test('pending keeps the rows and marks the refresh', () => {
    const html = renderToString(channels({ pending: true }));
    expect(html).toMatch(/^<div [^>]*data-pending="" aria-busy="true"/);
    expect(widths(html)).toHaveLength(5);
  });

  test('render composes the root with the state; an item takes render too', () => {
    const html = renderToString(
      <RankedListRoot
        status="loading"
        render={(props, state) => createElement('section', { ...props, title: state.status })}
      >
        <RankedListItem label="A" value={1} />
      </RankedListRoot>,
    );
    expect(html).toMatch(/^<section [^>]*class="nz-card nz-ranked-list"[^>]*title="loading"/);
    const item = renderToString(
      <RankedListItem
        label="A"
        value={1}
        max={4}
        render={(props, state) => createElement('li', { ...props, title: String(state.ratio) })}
      />,
    );
    expect(item).toContain('title="0.25"');
  });
});

describe('§16.5 statuses', () => {
  test('loading: aria-busy, static hidden text with the title, skeleton rows reserved, no live region', () => {
    const html = renderToString(<RankedListRoot title="Top channels" status="loading" />);
    expect(html).toMatch(/^<div data-slot="ranked-list" [^>]*data-loading="" aria-busy="true"/);
    expect(html).toContain('<span class="nz-visually-hidden">Loading Top channels</span>');
    expect(html.match(/data-slot="ranked-list-placeholder"/g)).toHaveLength(5);
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(10);
    expect(html).toContain('<div class="nz-ranked-list-reserve" aria-hidden="true">');
    expect(html).not.toMatch(/aria-live|role="status"|role="alert"|<ol/);
  });

  test('a ready list with no items is empty; rows sets the reserve', () => {
    const html = renderToString(<RankedListRoot title="Top cities" rows={3} />);
    expect(html).toMatch(/^<div [^>]*data-empty=""/);
    expect(html).not.toContain('aria-busy');
    expect(html).toContain('<p class="nz-ranked-list-empty">No data</p>');
    expect(html.match(/data-slot="ranked-list-placeholder"/g)).toHaveLength(3);
    expect(html).not.toContain('data-slot="skeleton"');
  });

  test('a title that is an element goes into the text as it is', () => {
    const html = renderToString(<RankedListRoot title={<em>Top cities</em>} status="loading" />);
    expect(html.replaceAll('<!-- -->', '')).toContain(
      '<span class="nz-visually-hidden">Loading <em>Top cities</em></span>',
    );
  });

  test('error: an InlineError with the title, not live; slots and labels replace the defaults', () => {
    const html = renderToString(<RankedListRoot title="Top products" status="error" />);
    expect(html).toMatch(/^<div [^>]*data-error=""/);
    expect(html).toContain('data-slot="inline-error"');
    expect(html).toContain('Could not load Top products');
    expect(html).not.toMatch(/aria-live|role="alert"/);

    const custom = renderToString(
      <RankedListRoot
        status="error"
        error={<p>Retry later</p>}
        labels={{ loading: 'Chargement de {label}' }}
      />,
    );
    expect(custom).toContain('<p>Retry later</p>');
    const untitled = renderToString(
      <RankedListRoot status="loading" labels={{ loading: 'Chargement de {label}' }} />,
    );
    expect(untitled).toContain('<span class="nz-visually-hidden">Chargement de</span>');
    const empty = renderToString(<RankedListRoot status="empty" empty={<p>Nothing sold yet</p>} />);
    expect(empty).toContain('<p>Nothing sold yet</p>');
  });

  test('pending is ignored outside ready (Metric does the same)', () => {
    const html = renderToString(<RankedListRoot status="empty" pending />);
    expect(html).not.toContain('data-pending');
    expect(html).not.toContain('aria-busy');
  });
});

// PageIndicator (ARCHITECTURE.md §21.3; D-cz): server-safe, 0 KB of client JS. Module graph, RSC render
// with no client boundary, and markup: the decorative dots or fraction (aria-hidden) beside a
// visually hidden position, the current dot marked, the numbers in the locale, clamping, labels.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { PageIndicator } from '../../src/page-indicator/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/page-indicator/index.ts');

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
        import('../../src/page-indicator/index'),
        import('../../src/page-indicator/page-indicator.example'),
      ]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry)).toEqual(['PageIndicator']);
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
  test('dots: a hidden position, then decorative dots with the current one selected', () => {
    expect(renderToString(<PageIndicator count={3} current={2} />)).toBe(
      '<div data-slot="page-indicator" data-variant="dots" data-tone="surface" class="nz-page-indicator">' +
        '<span class="nz-visually-hidden">2 of 3</span>' +
        '<span class="nz-page-indicator-dots" data-slot="page-indicator-dots" aria-hidden="true">' +
        '<span class="nz-page-indicator-dot" data-slot="page-indicator-dot"></span>' +
        '<span class="nz-page-indicator-dot" data-slot="page-indicator-dot" data-selected=""></span>' +
        '<span class="nz-page-indicator-dot" data-slot="page-indicator-dot"></span>' +
        '</span></div>',
    );
  });

  test('fraction, over media, with the numbers in the locale', () => {
    const html = renderToString(
      <PageIndicator count={1200} current={1000} variant="fraction" tone="media" locale="de-DE" />,
    );
    expect(html).toContain('data-variant="fraction" data-tone="media"');
    expect(html).toContain('<span class="nz-visually-hidden">1.000 of 1.200</span>');
    expect(html).toContain('aria-hidden="true">1.000<!-- --> / <!-- -->1.200</span>');
  });

  test('current is clamped to 1…count; labels set the hidden position', () => {
    expect(renderToString(<PageIndicator count={3} current={9} />)).toContain('>3 of 3<');
    expect(renderToString(<PageIndicator count={3} current={0} />)).toContain('>1 of 3<');
    expect(
      renderToString(
        <PageIndicator count={4} current={2} labels={{ position: 'Foto {current} von {count}' }} />,
      ),
    ).toContain('>Foto 2 von 4<');
  });

  test('className and other props reach the root', () => {
    expect(
      renderToString(<PageIndicator count={2} current={1} className="on-card" id="pager" />),
    ).toMatch(
      /^<div data-slot="page-indicator" data-variant="dots" data-tone="surface" id="pager" class="nz-page-indicator on-card">/,
    );
  });
});

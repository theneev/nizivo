import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { Skeleton } from '../../src/skeleton/skeleton';
import { SkeletonExample } from '../../src/skeleton/skeleton.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Skeleton is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/skeleton/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Skeleton markup', () => {
  test('an empty span hidden from assistive technology', () => {
    expect(renderToString(<Skeleton className="kpi-value" />)).toBe(
      '<span data-slot="skeleton" data-shape="line" class="nz-skeleton kpi-value" aria-hidden="true"></span>',
    );
  });

  test('shape is an attribute, for the radius and the circle', () => {
    expect(renderToString(<Skeleton shape="circle" />)).toContain('data-shape="circle"');
    expect(renderToString(<Skeleton shape="block" />)).toContain('data-shape="block"');
  });

  test('the block stays hidden even if a consumer passes aria-hidden={false}', () => {
    expect(renderToString(<Skeleton aria-hidden={false} />)).toContain('aria-hidden="true"');
  });

  test('render swaps the element and keeps the part', () => {
    expect(renderToString(<Skeleton render={<div />} />)).toBe(
      '<div data-slot="skeleton" data-shape="line" class="nz-skeleton" aria-hidden="true"></div>',
    );
  });

  test('the example marks the loading region busy, with text for assistive technology', () => {
    const html = renderToString(<SkeletonExample />);
    expect(html).toMatch(
      /^<div aria-busy="true"><span class="nz-visually-hidden">Loading orders<\/span>/,
    );
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(3);
  });
});

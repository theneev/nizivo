import type { ComponentPropsWithRef, JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { Badge } from '../../src/badge/badge';
import { BadgeExample } from '../../src/badge/badge.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

describe('Badge is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/badge/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Badge markup', () => {
  test('a span with its tone and a decorative dot before the label', () => {
    expect(renderToString(<Badge tone="success">Paid</Badge>)).toBe(
      '<span data-slot="badge" data-tone="success" class="nz-badge">' +
        '<span class="nz-badge-dot" data-slot="badge-dot" aria-hidden="true"></span>Paid</span>',
    );
  });

  test('neutral by default; dot={false} drops the dot; className is appended', () => {
    expect(
      renderToString(
        <Badge dot={false} className="mine" id="b">
          Draft
        </Badge>,
      ),
    ).toBe('<span data-slot="badge" data-tone="neutral" id="b" class="nz-badge mine">Draft</span>');
  });

  test('render: the element keeps its own props, the part keeps data-slot and data-tone', () => {
    const html = renderToString(
      <Badge render={<Link href="/orders" data-tone="brand" data-slot="link" />} tone="success">
        Paid
      </Badge>,
    );
    expect(html).toMatch(
      /^<a href="\/orders" data-tone="success" data-slot="badge" class="nz-badge">/,
    );
    expect(html).toContain('aria-hidden="true"></span>Paid</a>');
  });

  test('the example renders', () => {
    const html = renderToString(<BadgeExample />);
    expect(html.match(/data-slot="badge"/g)).toHaveLength(7);
    expect(html).toContain('data-tone="brand" class="nz-badge">New</span>');
  });
});

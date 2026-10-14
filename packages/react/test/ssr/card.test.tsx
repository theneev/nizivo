import type { ComponentPropsWithRef, JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { CardExample } from '../../src/card/card.example';
import { Card, CardRoot, CardTitle } from '../../src/card/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

function Heading({ children, ...props }: ComponentPropsWithRef<'h2'>): JSX.Element {
  return <h2 {...props}>{children}</h2>;
}

describe('Card is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/card/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Card markup', () => {
  test('the namespace and the flat parts are the same functions', () => {
    expect(Card.Root).toBe(CardRoot);
    expect(Card.Title).toBe(CardTitle);
    expect(Object.keys(Card).toSorted()).toEqual([
      'Action',
      'Body',
      'Description',
      'Footer',
      'Header',
      'Root',
      'Title',
    ]);
  });

  test('every part carries its class and data-slot; the title is an h3 by default', () => {
    const html = renderToString(
      <Card.Root>
        <Card.Header>
          <Card.Title>Top products</Card.Title>
          <Card.Description>Last 30 days</Card.Description>
          <Card.Action>…</Card.Action>
        </Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card.Root>,
    );
    expect(html).toBe(
      '<div data-slot="card" data-tone="surface" data-padding="md" class="nz-card">' +
        '<div data-slot="card-header" class="nz-card-header">' +
        '<h3 data-slot="card-title" class="nz-card-title">Top products</h3>' +
        '<p data-slot="card-description" class="nz-card-description">Last 30 days</p>' +
        '<div data-slot="card-action" class="nz-card-action">…</div></div>' +
        '<div data-slot="card-body" class="nz-card-body">Body</div>' +
        '<div data-slot="card-footer" class="nz-card-footer">Footer</div></div>',
    );
  });

  test('level picks the heading element; the look stays the same class', () => {
    expect(renderToString(<Card.Title level={2}>Plan</Card.Title>)).toBe(
      '<h2 data-slot="card-title" class="nz-card-title">Plan</h2>',
    );
    expect(renderToString(<Card.Title level={6}>Plan</Card.Title>)).toMatch(/^<h6 /);
  });

  test('inverse scopes the inverse scheme; other tones do not', () => {
    expect(renderToString(<Card.Root tone="inverse" />)).toBe(
      '<div data-slot="card" data-tone="inverse" data-padding="md" data-nz-scheme="inverse" class="nz-card"></div>',
    );
    expect(renderToString(<Card.Root tone="subtle" />)).not.toContain('data-nz-scheme');
  });

  test('padding is always an attribute; elevation only when raised', () => {
    expect(renderToString(<Card.Root padding="sm" elevation={1} />)).toBe(
      '<div data-slot="card" data-tone="surface" data-padding="sm" data-elevation="1" class="nz-card"></div>',
    );
    expect(renderToString(<Card.Root elevation={0} />)).not.toContain('data-elevation');
  });

  test('render on the root and on a part: the element keeps its props, the part its slot and tone', () => {
    const root = renderToString(
      <Card.Root tone="subtle" render={<section aria-label="Plan" data-tone="surface" />} />,
    );
    expect(root).toBe(
      '<section aria-label="Plan" data-tone="subtle" data-slot="card" data-padding="md" class="nz-card"></section>',
    );
    const title = renderToString(
      <Card.Title render={<Heading id="t" data-slot="heading" />}>Plan</Card.Title>,
    );
    expect(title).toBe('<h2 id="t" data-slot="card-title" class="nz-card-title">Plan</h2>');
  });

  test('the example renders', () => {
    const html = renderToString(<CardExample />);
    expect(html.match(/data-slot="card"/g)).toHaveLength(3);
    expect(html).toContain(
      '<section aria-label="Tip" data-slot="card" data-tone="inverse" data-padding="md" data-nz-scheme="inverse" class="nz-card">',
    );
  });
});

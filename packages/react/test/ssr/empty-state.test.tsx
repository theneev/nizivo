import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { EmptyState } from '../../src/empty-state/empty-state';
import { EmptyStateExample } from '../../src/empty-state/empty-state.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('EmptyState is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/empty-state/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('EmptyState markup', () => {
  test('a title at level 2 by default, with no media or actions wrappers when absent', () => {
    expect(renderToString(<EmptyState title="No orders yet" />)).toBe(
      '<div data-slot="empty-state" class="nz-empty-state">' +
        '<h2 class="nz-empty-state-title" data-slot="empty-state-title">No orders yet</h2></div>',
    );
  });

  test('level sets the heading element; media and actions get their slots', () => {
    const html = renderToString(
      <EmptyState
        level={4}
        title="Nothing matches"
        media={<svg />}
        actions={<a href="/">Back</a>}
      />,
    );
    expect(html).toContain(
      '<div class="nz-empty-state-media" data-slot="empty-state-media"><svg></svg></div>',
    );
    expect(html).toContain(
      '<h4 class="nz-empty-state-title" data-slot="empty-state-title">Nothing matches</h4>',
    );
    expect(html).toContain(
      '<div class="nz-empty-state-actions" data-slot="empty-state-actions"><a href="/">Back</a></div>',
    );
  });

  test('the example renders server Buttons in the actions slot', () => {
    const html = renderToString(<EmptyStateExample />);
    expect(html.match(/data-slot="empty-state"/g)).toHaveLength(2);
    expect(html).toContain('<h3 class="nz-empty-state-title"');
    expect(html).toContain('data-slot="button" data-variant="primary"');
  });
});

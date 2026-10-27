// Server-first (ARCHITECTURE.md §14.1): Heatmap loads and renders with React's react-server
// build, as in a Server Component (this file runs in the `react-server` project, vitest.config.ts),
// and renders no client reference: it has no island, so a page that draws it ships no chart
// JavaScript.
import * as React from 'react';
import { isValidElement, type ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

const { Heatmap } = await import('../../src/heatmap/index');

const CLIENT_REFERENCE = Symbol.for('react.client.reference');

/** Calls server components until only host elements remain; a client reference is counted. */
function serverRender(node: ReactNode, found: string[]): unknown {
  if (Array.isArray(node)) return node.map((child: ReactNode) => serverRender(child, found));
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(node)) return node;
  const { type, props } = node;
  if (typeof type === 'function' && Reflect.get(type, '$$typeof') === CLIENT_REFERENCE) {
    found.push(String(Reflect.get(type, '$$id')));
    return null;
  }
  if (typeof type === 'function')
    return serverRender(Reflect.apply(type, undefined, [props]), found);
  return { type, props: { ...props, children: serverRender(props.children, found) } };
}

/** A minimal hook dispatcher serving only `useId`, the one hook a server part may call. */
function withUseId<T>(render: () => T): T {
  const react: Record<string, unknown> = { ...React };
  expect(react).not.toHaveProperty('useState');
  const internals = react['__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'];
  if (typeof internals !== 'object' || internals === null)
    throw new Error('not the react-server build');
  let id = 0;
  Reflect.set(internals, 'H', { useId: () => `_S_${(id += 1).toString(32)}_` });
  try {
    return render();
  } finally {
    Reflect.set(internals, 'H', null);
  }
}

describe('Heatmap under react-server', () => {
  test('renders with no client reference', () => {
    const found: string[] = [];
    const tree = withUseId(() =>
      serverRender(
        <Heatmap
          title="Orders by hour"
          data={[
            { day: 'Mon', hour: '00', n: 1 },
            { day: 'Mon', hour: '02', n: 5 },
          ]}
          x="hour"
          y="day"
          value="n"
        />,
        found,
      ),
    );
    expect(found).toEqual([]);
    expect(JSON.stringify(tree)).toContain('nz-heatmap-cell');
  });
});

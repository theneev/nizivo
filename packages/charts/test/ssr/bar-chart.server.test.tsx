// Server-first (ARCHITECTURE.md §14.1): BarChart loads and renders with React's react-server build,
// as in a Server Component (this file runs in the `react-server` project, vitest.config.ts). A
// hook other than useId, or a client-only module in its graph, would throw here.
import * as React from 'react';
import { isValidElement, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { BarChart } from '../../src/bar-chart/index';

/** Calls function components until only host elements remain, as RSC does for server parts. */
function serverRender(node: ReactNode): unknown {
  if (Array.isArray(node)) return node.map((child: ReactNode) => serverRender(child));
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(node)) return node;
  const { type, props } = node;
  if (typeof type === 'function') return serverRender(Reflect.apply(type, undefined, [props]));
  return { type, props: { ...props, children: serverRender(props.children) } };
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

test('BarChart renders to host elements on the server, in every status', () => {
  for (const status of ['ready', 'loading', 'empty', 'error'] as const) {
    const tree = JSON.stringify(
      withUseId(() =>
        serverRender(
          <BarChart
            title="Orders"
            status={status}
            data={[
              { d: '2026-10-14', v: 3 },
              { d: '2026-10-15', v: -1 },
            ]}
            x={(d) => d.d}
            y={(d) => d.v}
          />,
        ),
      ),
    );
    expect(tree).toContain('"type":"figure"');
    expect(tree.includes('"type":"rect"') || tree.includes('"type":"path"')).toBe(
      status === 'ready',
    );
  }
});

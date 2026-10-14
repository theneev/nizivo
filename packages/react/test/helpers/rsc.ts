// A faithful-enough React Server Component render for unit tests (ARCHITECTURE.md §9.5, §18.1).
// Unlike a plain import under the react-server build, a 'use client' module is replaced by client
// references, as a bundler does: it is never evaluated on the server, so a leaf that calls
// createContext at module level (FieldScope) loads, and the render stops at its boundary. The props
// that cross the boundary are then checked for what RSC cannot serialise.
import { isValidElement, type ReactNode } from 'react';
import { expect, vi } from 'vitest';

const CLIENT_REFERENCE = Symbol.for('react.client.reference');

/** A stand-in client reference: rendering it on the server records it; calling it throws. */
export interface ClientReference {
  (): never;
  $$typeof: symbol;
  $$id: string;
}

export function clientReference(id: string): ClientReference {
  const reference = (): never => {
    throw new Error(`${id} is a client reference: the server never calls it`);
  };
  return Object.assign(reference, { $$typeof: CLIENT_REFERENCE, $$id: id });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isClientReference(value: unknown): value is ClientReference {
  return typeof value === 'function' && Reflect.get(value, '$$typeof') === CLIENT_REFERENCE;
}

/**
 * Imports `load` again with `react` resolved to its react-server build, and each module in
 * `clientModules` (`{ specifier, exports }`, specifiers relative to the calling test file through
 * `resolve`) replaced by client references for the named exports.
 */
export async function underReactServer<T>(
  load: () => Promise<T>,
  clientModules: ReadonlyArray<{ path: string; exports: readonly string[] }> = [],
): Promise<{ loaded: T; react: Record<string, unknown> }> {
  vi.resetModules();
  const path = '../../node_modules/react/react.react-server.js';
  const imported: unknown = await import(/* @vite-ignore */ path);
  const server = isRecord(imported) && isRecord(imported['default']) ? imported['default'] : {};
  expect(server).toHaveProperty('createElement');
  vi.doMock('react', () => ({ ...server, default: server }));
  for (const module of clientModules) {
    vi.doMock(module.path, () =>
      Object.fromEntries(module.exports.map((name) => [name, clientReference(name)])),
    );
  }
  try {
    // vi.doMock only queues the mock; importing react here settles the queue before `load` runs.
    // Without it, parallel test files sometimes load the component against the real React.
    const settled: unknown = await import('react');
    if (isRecord(settled) && 'useState' in settled) {
      throw new Error('the react-server mock of react is not in place');
    }
    return { loaded: await load(), react: server };
  } finally {
    vi.doUnmock('react');
    for (const module of clientModules) vi.doUnmock(module.path);
    vi.resetModules();
  }
}

/**
 * A Server Component render installs a hook dispatcher. This one serves `useId`, the only hook a
 * server part may call; any other hook is missing from the react-server build and throws.
 */
export function withDispatcher<T>(react: Record<string, unknown>, render: () => T): T {
  const internals = react['__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'];
  if (!isRecord(internals)) throw new Error('the react-server build has no internals object');
  let id = 0;
  internals['H'] = { useId: () => `_S_${(id += 1).toString(32)}_` };
  try {
    return render();
  } finally {
    internals['H'] = null;
  }
}

/** A client component element, as the server hands it to the client: its id and its props. */
export interface ClientBoundary {
  client: string;
  props: Record<string, unknown>;
}

/**
 * Calls server function components until only host elements and client boundaries remain.
 * A client boundary's props are kept as given (its `children` rendered on the server first, as RSC
 * does) and collected in `boundaries`.
 */
export function serverRender(node: ReactNode, boundaries: ClientBoundary[] = []): unknown {
  if (Array.isArray(node)) return node.map((child: ReactNode) => serverRender(child, boundaries));
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(node)) return node;
  const { type, props } = node;
  if (isClientReference(type)) {
    // Recorded before its children, so boundaries come in tree order.
    const boundary: ClientBoundary = { client: type.$$id, props: { ...props } };
    boundaries.push(boundary);
    boundary.props['children'] = serverRender(props.children, boundaries);
    return boundary;
  }
  if (typeof type === 'function') {
    const output: ReactNode = Reflect.apply(type, undefined, [props]);
    return serverRender(output, boundaries);
  }
  return { type, props: { ...props, children: serverRender(props.children, boundaries) } };
}

/**
 * Paths to every value RSC cannot send to a client component: functions (other than client
 * references), symbols, class instances other than plain objects, arrays and React elements.
 */
export function unserialisable(value: unknown, path = 'props'): string[] {
  if (value === null || value === undefined) return [];
  if (isClientReference(value)) return [];
  if (typeof value === 'function') return [`${path}: function`];
  if (typeof value === 'symbol') return [`${path}: symbol`];
  if (typeof value !== 'object') return [];
  if (isValidElement<Record<string, unknown>>(value)) {
    return unserialisable(value.props, `${path}.props`);
  }
  if (Array.isArray(value))
    return value.flatMap((item, i) => unserialisable(item, `${path}[${i}]`));
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return [`${path}: class instance`];
  return Object.entries(value).flatMap(([key, item]) => unserialisable(item, `${path}.${key}`));
}

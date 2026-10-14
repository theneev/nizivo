// Server-safety of every week 2 T0 component (ARCHITECTURE.md §9.5, §18.1 "server-safe entries
// load under react-server"): each entry loads, and its example renders, with React's react-server build.
import { isValidElement, type JSX, type ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import { Container } from '../../src/container/index';
import { Grid, GridItem } from '../../src/grid/index';
import { Heading } from '../../src/heading/index';
import { Image } from '../../src/image/index';
import { Inline } from '../../src/inline/index';
import { Kbd } from '../../src/kbd/index';
import { Separator } from '../../src/separator/index';
import { Stack } from '../../src/stack/index';
import { Text } from '../../src/text/index';

const COMPONENTS = [
  'text',
  'heading',
  'stack',
  'inline',
  'grid',
  'container',
  'separator',
  'kbd',
  'image',
  'badge',
  'card',
  'delta',
  'progress-bar',
  'progress-ring',
  'meter',
  'skeleton',
  'empty-state',
  'inline-error',
  'alert',
] as const;

/** The client leaves a split component's subpath may reach (§9.5 "split"); none for the others. */
const CLIENT_LEAVES: Partial<Record<(typeof COMPONENTS)[number], string[]>> = {
  alert: ['src/alert/alert-dismiss.client.tsx'],
};

/** Each entry, imported again by the react-server test. */
const entries = {
  text: () => import('../../src/text/index'),
  heading: () => import('../../src/heading/index'),
  stack: () => import('../../src/stack/index'),
  inline: () => import('../../src/inline/index'),
  grid: () => import('../../src/grid/index'),
  container: () => import('../../src/container/index'),
  separator: () => import('../../src/separator/index'),
  kbd: () => import('../../src/kbd/index'),
  image: () => import('../../src/image/index'),
  badge: () => import('../../src/badge/index'),
  card: () => import('../../src/card/index'),
  delta: () => import('../../src/delta/index'),
  'progress-bar': () => import('../../src/progress-bar/index'),
  'progress-ring': () => import('../../src/progress-ring/index'),
  meter: () => import('../../src/meter/index'),
  skeleton: () => import('../../src/skeleton/index'),
  'empty-state': () => import('../../src/empty-state/index'),
  'inline-error': () => import('../../src/inline-error/index'),
  alert: () => import('../../src/alert/index'),
} satisfies Record<(typeof COMPONENTS)[number], () => Promise<unknown>>;

/** Each example, imported again by the react-server test. */
const exampleModules = {
  text: async () => (await import('../../src/text/text.example')).TextExample,
  heading: async () => (await import('../../src/heading/heading.example')).HeadingExample,
  stack: async () => (await import('../../src/stack/stack.example')).StackExample,
  inline: async () => (await import('../../src/inline/inline.example')).InlineExample,
  grid: async () => (await import('../../src/grid/grid.example')).GridExample,
  container: async () => (await import('../../src/container/container.example')).ContainerExample,
  separator: async () => (await import('../../src/separator/separator.example')).SeparatorExample,
  kbd: async () => (await import('../../src/kbd/kbd.example')).KbdExample,
  image: async () => (await import('../../src/image/image.example')).ImageExample,
  badge: async () => (await import('../../src/badge/badge.example')).BadgeExample,
  card: async () => (await import('../../src/card/card.example')).CardExample,
  delta: async () => (await import('../../src/delta/delta.example')).DeltaExample,
  'progress-bar': async () =>
    (await import('../../src/progress-bar/progress-bar.example')).ProgressBarExample,
  'progress-ring': async () =>
    (await import('../../src/progress-ring/progress-ring.example')).ProgressRingExample,
  meter: async () => (await import('../../src/meter/meter.example')).MeterExample,
  skeleton: async () => (await import('../../src/skeleton/skeleton.example')).SkeletonExample,
  'empty-state': async () =>
    (await import('../../src/empty-state/empty-state.example')).EmptyStateExample,
  'inline-error': async () =>
    (await import('../../src/inline-error/inline-error.example')).InlineErrorExample,
  alert: async () => (await import('../../src/alert/alert.example')).AlertExample,
} satisfies Record<(typeof COMPONENTS)[number], () => Promise<() => JSX.Element>>;

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

/**
 * Imports `load` again with `react` resolved to its react-server build, the build a Server Component
 * bundle gets: no useState, useEffect, createContext or useRef. Vitest runs without that condition,
 * so the build is loaded by path. The JSX runtime stays the default one; it only creates elements.
 */
async function underReactServer<T>(
  load: () => Promise<T>,
): Promise<{ loaded: T; react: Record<string, unknown> }> {
  vi.resetModules();
  const path = '../../node_modules/react/react.react-server.js';
  const imported: unknown = await import(/* @vite-ignore */ path);
  const server = isRecord(imported) && isRecord(imported['default']) ? imported['default'] : {};
  expect(server).toHaveProperty('createElement');
  vi.doMock('react', () => ({ ...server, default: server }));
  try {
    return { loaded: await load(), react: server };
  } finally {
    vi.doUnmock('react');
    vi.resetModules();
  }
}

/**
 * A Server Component render installs a hook dispatcher. This one serves `useId`, the only hook a T0
 * part may call; any other hook is missing from the react-server build and throws.
 */
function withDispatcher<T>(react: Record<string, unknown>, render: () => T): T {
  const internals = react['__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'];
  if (!isRecord(internals)) throw new Error('the react-server build has no internals object');
  let id = 0;
  internals['H'] = { useId: () => `_r${(id += 1).toString()}_` };
  try {
    return render();
  } finally {
    internals['H'] = null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Calls function components until only host elements remain, as a Server Component render does. */
function serverRender(node: ReactNode): unknown {
  if (Array.isArray(node)) return node.map(serverRender);
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  const { type, props } = node;
  if (typeof type === 'function') {
    const rendered: ReactNode = Reflect.apply(type, undefined, [props]);
    return serverRender(rendered);
  }
  return { type, props: { ...props, children: serverRender(props.children) } };
}

describe('module graph', () => {
  for (const name of COMPONENTS) {
    test(`${name}: no 'use client' module but its own leaves, and nothing imported but react`, () => {
      const { modules, externals } = graph(SRC, `src/${name}/index.ts`);
      expect(modules).toContain(`src/${name}/${name}.tsx`);
      expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual(
        CLIENT_LEAVES[name] ?? [],
      );
      expect([...externals].filter((external) => external !== 'react')).toEqual([]);
    });
  }
});

describe('react-server build of React', () => {
  test('the mock bites: a module that needs createContext fails to load', async () => {
    await expect(underReactServer(() => import('../../src/config/config.client'))).rejects.toThrow(
      /createContext/,
    );
  });

  test('the dispatcher bites: a hook other than useId fails to render', async () => {
    const { react } = await underReactServer(() => Promise.resolve());
    const useState = react['useState'];
    expect(useState).toBeUndefined();
    const useMemo = react['useMemo'];
    expect(() =>
      withDispatcher(react, () => (typeof useMemo === 'function' ? useMemo(() => 1, []) : 0)),
    ).toThrow(/useMemo is not a function/);
  });

  for (const name of COMPONENTS) {
    test(`${name}: the entry loads and its example renders to host elements`, async () => {
      const {
        loaded: [entry, Example],
        react,
      } = await underReactServer(() => Promise.all([entries[name](), exampleModules[name]()]));
      expect(Object.keys(entry).length).toBeGreaterThan(0);
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example())));
      expect(tree).toContain(`"data-slot":"${name}"`);
    });
  }
});

describe('refs', () => {
  // React 19: `ref` is a prop, so it reaches the host element through the rest props, with no forwardRef.
  const ref = { current: null };
  const elements = {
    text: Text({ ref }),
    heading: Heading({ level: 2, ref }),
    stack: Stack({ ref }),
    inline: Inline({ ref }),
    grid: Grid({ ref }),
    'grid-item': GridItem({ ref }),
    container: Container({ ref }),
    separator: Separator({ ref }),
    kbd: Kbd({ ref }),
    image: Image({ src: '/a.jpg', alt: '', width: 1, height: 1, ref }),
  };
  for (const [slot, element] of Object.entries(elements)) {
    test(`${slot}: the ref is on the host element`, () => {
      expect(typeof element.type).toBe('string');
      expect(element.props).toMatchObject({ 'data-slot': slot, ref });
    });
  }
});

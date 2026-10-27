// Surface (ARCHITECTURE.md §13, §21.3; D-dc): server-safe, 0 KB of client JS. Module graph, RSC
// render with no client boundary, and markup: the material as data-material, `render` for another
// element.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Surface } from '../../src/surface/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/surface/index.ts');

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
      Promise.all([import('../../src/surface/index'), import('../../src/surface/surface.example')]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry)).toEqual(['Surface']);
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
  test('solid by default', () => {
    expect(renderToString(<Surface>Hi</Surface>)).toBe(
      '<div data-slot="surface" data-material="solid" class="nz-surface">Hi</div>',
    );
  });

  test('glass, rendered as a nav', () => {
    expect(renderToString(<Surface material="glass" render={<nav aria-label="Main" />} />)).toBe(
      '<nav aria-label="Main" data-slot="surface" data-material="glass" class="nz-surface"></nav>',
    );
  });
});

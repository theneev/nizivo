// Server-safety of every `tier: "server"` component (ARCHITECTURE.md §9.5, §18.1 "server-safe entries
// load under react-server"): each entry loads, and every example renders, with React's react-server
// build. A split component's client leaves are replaced by client references, as a bundler does, so
// they are never evaluated on the server; the props that cross into them must serialise.
// Client-tier controls (Input, Textarea, Checkbox, Switch, RadioGroup) are not
// listed: their server-safety proof is their own test file in this folder.
import { isValidElement, type JSX } from 'react';
import { describe, expect, test } from 'vitest';
import {
  graph,
  isClient,
  reactImports,
  REACT_SERVER,
  rekey,
  resolve,
  specifiers,
} from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
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
  'button',
  'field',
  'fieldset',
  'native-select',
] as const;
type Name = (typeof COMPONENTS)[number];

const FIELD_SCOPE = 'src/field/field-scope.client.tsx';

/** The client leaves a split component's subpath may reach (§9.5 "split"); none for the others. */
const CLIENT_LEAVES: Partial<Record<Name, string[]>> = {
  alert: ['src/alert/alert-dismiss.client.tsx'],
  field: [FIELD_SCOPE],
};

/** Packages other than react a subpath may import: only through its client leaves (the engine). */
const EXTERNALS: Partial<Record<Name, RegExp>> = {};

/** Each client module's exports, replaced by client references under react-server. */
const CLIENT_EXPORTS: Record<string, string[]> = {
  'src/alert/alert-dismiss.client.tsx': ['AlertDismiss'],
  [FIELD_SCOPE]: ['FieldScope', 'useFieldControl'],
  // client controls the Field and Fieldset examples compose
  'src/input/input.client.tsx': ['Input'],
  'src/checkbox/checkbox.client.tsx': ['Checkbox'],
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
  button: () => import('../../src/button/index'),
  field: () => import('../../src/field/index'),
  fieldset: () => import('../../src/fieldset/index'),
  'native-select': () => import('../../src/native-select/index'),
} satisfies Record<Name, () => Promise<unknown>>;

/** Each example module, imported again by the react-server test; every `*Example` export renders. */
const exampleModules = {
  text: () => import('../../src/text/text.example'),
  heading: () => import('../../src/heading/heading.example'),
  stack: () => import('../../src/stack/stack.example'),
  inline: () => import('../../src/inline/inline.example'),
  grid: () => import('../../src/grid/grid.example'),
  container: () => import('../../src/container/container.example'),
  separator: () => import('../../src/separator/separator.example'),
  kbd: () => import('../../src/kbd/kbd.example'),
  image: () => import('../../src/image/image.example'),
  badge: () => import('../../src/badge/badge.example'),
  card: () => import('../../src/card/card.example'),
  delta: () => import('../../src/delta/delta.example'),
  'progress-bar': () => import('../../src/progress-bar/progress-bar.example'),
  'progress-ring': () => import('../../src/progress-ring/progress-ring.example'),
  meter: () => import('../../src/meter/meter.example'),
  skeleton: () => import('../../src/skeleton/skeleton.example'),
  'empty-state': () => import('../../src/empty-state/empty-state.example'),
  'inline-error': () => import('../../src/inline-error/inline-error.example'),
  alert: () => import('../../src/alert/alert.example'),
  button: () => import('../../src/button/button.example'),
  field: () => import('../../src/field/field.example'),
  fieldset: () => import('../../src/fieldset/fieldset.example'),
  'native-select': () => import('../../src/native-select/native-select.example'),
} satisfies Record<Name, () => Promise<Record<string, unknown>>>;

/** What the rendered examples must contain, where it is not the component's own part. */
const RENDERS: Partial<Record<Name, string>> = {};

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The modules a subpath reaches before crossing into a 'use client' module: its server half. */
function serverHalf(entry: string): string[] {
  const reached = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() ?? '';
    if (reached.has(file) || isClient(SRC.get(file) ?? '')) continue;
    reached.add(file);
    for (const specifier of specifiers(SRC.get(file) ?? '')) {
      const target = specifier.startsWith('.') ? resolve(SRC, file, specifier) : undefined;
      if (target !== undefined) queue.push(target);
    }
  }
  return [...reached];
}

test('the list is every tier "server" manifest', () => {
  const server = [...SRC]
    .filter(([file]) => file.endsWith('/component.json'))
    .flatMap(([, text]) => {
      const manifest: unknown = JSON.parse(text);
      return isRecord(manifest) && manifest['tier'] === 'server' ? [String(manifest['name'])] : [];
    });
  expect([...COMPONENTS].toSorted()).toEqual(server.toSorted());
});

describe('module graph', () => {
  for (const name of COMPONENTS) {
    test(`${name}: no 'use client' module but its own leaves; only react-server React before them`, () => {
      const { modules, externals } = graph(SRC, `src/${name}/index.ts`);
      expect(modules).toContain(`src/${name}/${name}.tsx`);
      expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual(
        CLIENT_LEAVES[name] ?? [],
      );
      const allowed = EXTERNALS[name];
      expect(
        [...externals].filter(
          (external) => external !== 'react' && !(allowed?.test(external) ?? false),
        ),
      ).toEqual([]);
      const half = serverHalf(`src/${name}/index.ts`);
      expect(reactImports(SRC, half).filter((n) => !REACT_SERVER.has(n))).toEqual([]);
    });
  }
});

describe('react-server build of React', () => {
  test('the mock bites: a client module that is not replaced fails to load', async () => {
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
    test(`${name}: the entry loads and every example renders; boundary props serialise`, async () => {
      // Every client module the entry or its examples reach (an example may compose a Field).
      const reached = new Set<string>();
      for (const file of [`src/${name}/index.ts`, `src/${name}/${name}.example.tsx`]) {
        for (const module of graph(SRC, file).modules) reached.add(module);
      }
      const clients = [...reached].flatMap((file) => {
        const exports = CLIENT_EXPORTS[file];
        return exports === undefined
          ? []
          : [{ path: new URL(`../../${file}`, import.meta.url).pathname, exports }];
      });
      const {
        loaded: [entry, examples],
        react,
      } = await underReactServer(
        () => Promise.all([entries[name](), exampleModules[name]()]),
        clients,
      );
      expect(Object.keys(entry).length).toBeGreaterThan(0);
      const renders = Object.entries(examples).filter(
        (pair): pair is [string, (props: object) => JSX.Element] =>
          pair[0].endsWith('Example') && typeof pair[1] === 'function',
      );
      expect(renders.length).toBeGreaterThan(0);
      const boundaries: ClientBoundary[] = [];
      const tree = JSON.stringify(
        renders.map(([, Example]) =>
          withDispatcher(react, () => serverRender(Example({}), boundaries)),
        ),
      );
      expect(tree).toContain(RENDERS[name] ?? `"data-slot":"${name}"`);
      expect(boundaries.flatMap((b) => unserialisable(b.props, b.client))).toEqual([]);
      for (const b of boundaries) expect(isValidElement(b)).toBe(false);
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

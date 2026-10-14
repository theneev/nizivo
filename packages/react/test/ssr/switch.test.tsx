// Switch (ARCHITECTURE.md §9.5, §16.1; src/field/FIELD-CONTRACT.md): a native checkbox with
// role="switch" in a thin client leaf. Server-safety across the RSC boundary, the exact SSR HTML and
// Field wiring. Behaviour (thumb travel, FormData, RTL) runs in a browser: test/browser/toggles.spec.tsx.
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Field } from '../../src/field/field';
import { Switch } from '../../src/switch/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/switch/switch.client.tsx', import.meta.url).pathname,
    exports: ['Switch'],
  },
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
];

const VOCABULARY = new Set(
  Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
);

describe('module graph', () => {
  test('the subpath reaches only its own leaf and FieldScope as client modules; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/switch/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/field/field-scope.client.tsx',
      'src/switch/switch.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads; every example crosses the boundary with serialisable props only', async () => {
    const {
      loaded: [entry, loaded],
      react,
    } = await underReactServer(
      () =>
        Promise.all([import('../../src/switch/index'), import('../../src/switch/switch.example')]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['Switch']);
    for (const Example of Object.values(loaded)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('Switch');
      expect(unserialisable(boundaries)).toEqual([]);
    }
  });
});

describe('SSR markup', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  test('label root, native checkbox with role="switch" as the track, the thumb, then the label', () => {
    expect(
      renderToString(
        <Switch name="online" defaultChecked>
          Online store
        </Switch>,
      ),
    ).toBe(
      '<label data-slot="switch" class="nz-switch nz-hit-target">' +
        '<input type="checkbox" role="switch" class="nz-switch-input" data-slot="switch-input" name="online" checked=""/>' +
        '<span class="nz-switch-thumb" data-slot="switch-thumb" aria-hidden="true"></span>' +
        '<span class="nz-switch-label" data-slot="switch-label">Online store</span></label>',
    );
    // never aria-checked: the native checked state is the switch state (ARIA in HTML)
    expect(renderToString(<Switch checked onCheckedChange={() => {}} />)).not.toContain(
      'aria-checked',
    );
    expect(errors).not.toHaveBeenCalled();
  });

  test('disabled, required, invalid: native attributes plus root state; className on the root', () => {
    const html = renderToString(
      <Switch disabled required invalid className="mine" aria-label="Wholesale" />,
    );
    expect(html).toBe(
      '<label data-slot="switch" data-disabled="" data-required="" data-invalid="" class="nz-switch nz-hit-target mine">' +
        '<input required="" disabled="" aria-invalid="true" aria-label="Wholesale" type="checkbox" role="switch" class="nz-switch-input" data-slot="switch-input"/>' +
        '<span class="nz-switch-thumb" data-slot="switch-thumb" aria-hidden="true"></span></label>',
    );
  });

  test('inside a Field: id, describedby, invalid and required from the Field; never readOnly', () => {
    const html = renderToString(
      <Field
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
        name="wholesale"
        label="Wholesale"
        description="Approved buyers only."
        error="Set a price list first."
        required
        readOnly
      >
        <Switch>Enable</Switch>
      </Field>,
    );
    expect(html).toContain(
      '<label data-slot="switch" data-required="" data-invalid="" class="nz-switch nz-hit-target">' +
        '<input id="c" required="" aria-describedby="d e" aria-invalid="true" type="checkbox" role="switch" class="nz-switch-input" data-slot="switch-input" name="wholesale"/>',
    );
    expect(html).not.toMatch(/<input[^>]*readOnly/i);
  });

  test('render composes the root and receives the state', () => {
    const html = renderToString(
      <Switch
        disabled
        render={(props, state) => <div {...props} title={String(state.disabled)} />}
      />,
    );
    expect(html).toMatch(
      /^<div data-slot="switch" data-disabled="" class="nz-switch nz-hit-target" title="true">/,
    );
  });

  test('every example renders with no console error and only vocabulary data-* on parts', async () => {
    const examples = await import('../../src/switch/switch.example');
    for (const Example of Object.values(examples)) {
      const html = renderToString(<Example />);
      for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
        for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) {
          expect(VOCABULARY.has(name ?? '')).toBe(true);
        }
      }
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

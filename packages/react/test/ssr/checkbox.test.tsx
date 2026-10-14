// Checkbox (ARCHITECTURE.md §9.5, §16.1; src/field/FIELD-CONTRACT.md): a native checkbox in a thin
// client leaf. Server-safety across the RSC boundary, the exact SSR HTML, Field wiring and the
// vocabulary. Behaviour (indeterminate, FormData, native validation) runs in a browser:
// test/browser/toggles.spec.tsx.
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
import { Checkbox } from '../../src/checkbox/index';
import { Field } from '../../src/field/field';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/checkbox/checkbox.client.tsx', import.meta.url).pathname,
    exports: ['Checkbox'],
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
    const { modules, externals } = graph(SRC, 'src/checkbox/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/checkbox/checkbox.client.tsx',
      'src/field/field-scope.client.tsx',
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
        Promise.all([
          import('../../src/checkbox/index'),
          import('../../src/checkbox/checkbox.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['Checkbox']);
    for (const Example of Object.values(loaded)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('Checkbox');
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

  test('label root as hit target, native input as the box, glyphs, then the label text', () => {
    expect(renderToString(<Checkbox name="track">Track inventory</Checkbox>)).toBe(
      '<label data-slot="checkbox" class="nz-checkbox nz-hit-target">' +
        '<input type="checkbox" class="nz-checkbox-input" data-slot="checkbox-input" name="track"/>' +
        '<span class="nz-checkbox-indicator" data-slot="checkbox-indicator" aria-hidden="true">' +
        '<svg class="nz-glyph nz-glyph-check" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"></path></svg>' +
        '<svg class="nz-glyph nz-glyph-minus" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14"></path></svg>' +
        '</span><span class="nz-checkbox-label" data-slot="checkbox-label">Track inventory</span></label>',
    );
  });

  test('checked, mixed, disabled, required, invalid: native attributes plus root state', () => {
    expect(renderToString(<Checkbox defaultChecked />)).toContain('checked=""');
    // `indeterminate` is a DOM property with no attribute: set after hydration, unchecked until then
    const mixed = renderToString(<Checkbox defaultChecked="indeterminate" />);
    expect(mixed).not.toContain('checked');
    expect(mixed).not.toContain('indeterminate');
    expect(
      renderToString(<Checkbox checked="indeterminate" onCheckedChange={() => {}} />),
    ).not.toContain('checked=""');
    const html = renderToString(<Checkbox disabled required invalid value="yes" />);
    expect(html).toMatch(
      /^<label data-slot="checkbox" data-disabled="" data-required="" data-invalid="" class="nz-checkbox nz-hit-target">/,
    );
    expect(html).toContain(
      '<input required="" disabled="" aria-invalid="true" type="checkbox" class="nz-checkbox-input" data-slot="checkbox-input" value="yes"/>',
    );
    expect(errors).not.toHaveBeenCalled();
  });

  test('className and style go on the root, every other attribute on the input', () => {
    const html = renderToString(
      <Checkbox
        className="mine"
        style={{ marginInline: 4 }}
        aria-label="Select row"
        data-row="1"
      />,
    );
    expect(html).toMatch(
      /^<label data-slot="checkbox" class="nz-checkbox nz-hit-target mine" style="margin-inline:4px">/,
    );
    expect(html).toContain('<input aria-label="Select row" data-row="1" type="checkbox"');
    // no label span without children
    expect(html).not.toContain('checkbox-label');
  });

  test('indicator replaces both internal glyphs', () => {
    const html = renderToString(<Checkbox indicator={<i className="mine" />}>Row</Checkbox>);
    expect(html).toContain('aria-hidden="true"><i class="mine"></i></span>');
    expect(html).not.toContain('nz-glyph');
  });

  test('render composes the root and receives the state', () => {
    const html = renderToString(
      <Checkbox invalid render={(props, state) => <div {...props} title={String(state.invalid)} />}>
        Row
      </Checkbox>,
    );
    expect(html).toMatch(
      /^<div data-slot="checkbox" data-invalid="" class="nz-checkbox nz-hit-target" title="true">/,
    );
  });

  test('inside a Field: id, describedby, invalid and required from the Field; never readOnly', () => {
    const html = renderToString(
      <Field
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
        name="terms"
        label="Terms"
        description="Shown at checkout."
        error="Accept the terms."
        required
        readOnly
      >
        <Checkbox>I accept</Checkbox>
      </Field>,
    );
    expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l" for="c">');
    expect(html).toContain(
      '<label data-slot="checkbox" data-required="" data-invalid="" class="nz-checkbox nz-hit-target">' +
        '<input id="c" required="" aria-describedby="d e" aria-invalid="true" type="checkbox" class="nz-checkbox-input" data-slot="checkbox-input" name="terms"/>',
    );
    expect(html).not.toMatch(/<input[^>]*readOnly/i);
  });

  test("the box's own props win over the Field's, and its describedby is joined after the Field's", () => {
    const html = renderToString(
      <Field ids={{ description: 'd' }} label="Terms" description="Help" disabled required>
        <Checkbox id="own" name="own" disabled={false} required={false} aria-describedby="note" />
      </Field>,
    );
    expect(html).toMatch(
      /<label data-slot="checkbox" class="nz-checkbox nz-hit-target"><input id="own" aria-describedby="d note" type="checkbox" class="nz-checkbox-input" data-slot="checkbox-input" name="own"\/>/,
    );
  });

  test('every example renders with no console error and only vocabulary data-* on parts', async () => {
    const examples = await import('../../src/checkbox/checkbox.example');
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

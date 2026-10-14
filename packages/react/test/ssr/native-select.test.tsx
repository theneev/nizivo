// NativeSelect (ARCHITECTURE.md §9.5: T0, server): server-safety, SSR markup, and the zero-JS Field
// wiring through a function child (src/field/FIELD-CONTRACT.md). Layout parity with the Select
// trigger is measured in a browser: test/browser/controls.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Field } from '../../src/field/field';
import { NativeSelect } from '../../src/native-select/native-select';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const FIELD_SCOPE = {
  path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
  exports: ['FieldScope', 'useFieldControl'],
};

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('server-safety', () => {
  test('no client module, and only react-server imports', () => {
    const { modules, externals } = graph(SRC, 'src/native-select/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the entry loads under react-server; the examples render to host elements, no boundary', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/native-select/index'),
          import('../../src/native-select/native-select.example'),
        ]),
      // the examples sit in Fields, whose module imports FieldScope (never rendered here)
      [FIELD_SCOPE],
    );
    expect(Object.keys(entry)).toEqual(['NativeSelect']);
    expect(Object.keys(examples).toSorted()).toEqual([
      'NativeSelectExample',
      'NativeSelectGroupsExample',
      'NativeSelectSizesExample',
      'NativeSelectStatesExample',
    ]);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example(), boundaries)));
      expect(tree).toContain('"data-slot":"native-select-trigger"');
      expect(boundaries).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('wrapper, native select, chevron; optgroups pass through', () => {
    const html = renderToString(
      <NativeSelect aria-label="Period" name="period" defaultValue="30d">
        <optgroup label="Recent">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </optgroup>
      </NativeSelect>,
    );
    expect(html).toMatch(
      /^<span data-slot="native-select" data-size="md" class="nz-native-select">/,
    );
    expect(html).toContain(
      '<select aria-label="Period" name="period" class="nz-native-select-trigger" data-slot="native-select-trigger">' +
        '<optgroup label="Recent"><option value="7d">Last 7 days</option>' +
        '<option value="30d" selected="">Last 30 days</option></optgroup></select>',
    );
    expect(html).toContain(
      '<span class="nz-native-select-chevron" data-slot="native-select-chevron" aria-hidden="true">' +
        '<svg class="nz-glyph nz-glyph-chevrons-up-down"',
    );
  });

  test('placeholder: a disabled empty option, selected when no value is given', () => {
    const html = renderToString(
      <NativeSelect aria-label="Country" placeholder="Choose a country" required>
        <option value="IN">India</option>
      </NativeSelect>,
    );
    expect(html).toContain(
      '<option value="" disabled="" selected="">Choose a country</option><option value="IN">India</option>',
    );
    expect(html).toContain('required=""');
    // a given defaultValue wins
    expect(
      renderToString(
        <NativeSelect aria-label="Country" placeholder="Choose" defaultValue="IN">
          <option value="IN">India</option>
        </NativeSelect>,
      ),
    ).toContain('<option value="" disabled="">Choose</option><option value="IN" selected="">');
  });

  test('size, invalid, disabled and the icon; className and style on the wrapper', () => {
    const html = renderToString(
      <NativeSelect
        aria-label="Zone"
        size="sm"
        invalid
        disabled
        leadingIcon={<i />}
        className="mine"
        style={{ inlineSize: '100%' }}
      >
        <option>Europe</option>
      </NativeSelect>,
    );
    expect(html).toMatch(
      /^<span data-slot="native-select" data-size="sm" data-disabled="" data-invalid="" class="nz-native-select mine" style="inline-size:100%">/,
    );
    expect(html).toContain(
      '<span class="nz-native-select-icon" data-slot="native-select-icon" aria-hidden="true"><i></i></span>',
    );
    expect(html).toContain('<select aria-label="Zone" disabled="" aria-invalid="true"');
  });

  test('indicator replaces the chevron glyph', () => {
    const html = renderToString(
      <NativeSelect aria-label="Zone" indicator={<i className="arrow" />}>
        <option>Europe</option>
      </NativeSelect>,
    );
    expect(html).toContain('<i class="arrow"></i>');
    expect(html).not.toContain('nz-glyph-chevrons-up-down');
  });

  test('render composes the wrapper; the part keeps its slot and size', () => {
    const html = renderToString(
      <NativeSelect aria-label="Zone" size="lg" render={<div className="mine" data-size="sm" />}>
        <option>Europe</option>
      </NativeSelect>,
    );
    expect(html).toMatch(
      /^<div class="nz-native-select mine" data-size="lg" data-slot="native-select">/,
    );
    expect(html).toContain('<select aria-label="Zone" class="nz-native-select-trigger"');
  });
});

describe('zero-JS Field wiring (function child)', () => {
  test('id, name, required, describedby and aria-invalid arrive; readOnly is dropped', () => {
    const html = renderToString(
      <Field
        ids={IDS}
        name="zone"
        label="Shipping zone"
        description="Where it ships."
        error="Choose a zone."
        required
        readOnly
      >
        {(control) => (
          <NativeSelect {...control}>
            <option value="eu">Europe</option>
          </NativeSelect>
        )}
      </Field>,
    );
    expect(html).toContain('for="c"');
    expect(html).toContain(
      '<span data-slot="native-select" data-size="md" data-invalid="" class="nz-native-select">' +
        '<select id="c" name="zone" required="" aria-describedby="d e" aria-invalid="true" class="nz-native-select-trigger"',
    );
    expect(html).not.toMatch(/<select[^>]*readOnly/i);
  });

  test('a disabled Field disables the select and marks the wrapper', () => {
    const html = renderToString(
      <Field ids={IDS} label="Currency" disabled>
        {(control) => (
          <NativeSelect {...control}>
            <option>INR</option>
          </NativeSelect>
        )}
      </Field>,
    );
    expect(html).toContain('data-disabled="" class="nz-native-select"');
    expect(html).toContain('<select id="c" disabled=""');
  });

  test('an explicit invalid={false} wins over the Field’s aria-invalid', () => {
    const html = renderToString(
      <Field ids={IDS} label="Zone" error="Wrong">
        {(control) => (
          <NativeSelect {...control} invalid={false}>
            <option>EU</option>
          </NativeSelect>
        )}
      </Field>,
    );
    expect(html).not.toMatch(/<select[^>]*aria-invalid/);
    expect(html).toMatch(
      /<span data-slot="native-select" data-size="md" class="nz-native-select">/,
    );
  });
});

describe('zero-JS Field wiring (placed directly in a Field)', () => {
  test('the same wiring as a function child, and no FieldScope', () => {
    const direct = renderToString(
      <Field ids={IDS} name="zone" label="Zone" description="Where it ships." error="Pick" required>
        <NativeSelect>
          <option value="eu">Europe</option>
        </NativeSelect>
      </Field>,
    );
    const viaFunction = renderToString(
      <Field ids={IDS} name="zone" label="Zone" description="Where it ships." error="Pick" required>
        {(control) => (
          <NativeSelect {...control}>
            <option value="eu">Europe</option>
          </NativeSelect>
        )}
      </Field>,
    );
    expect(direct).toBe(viaFunction);
    expect(direct).not.toContain('data-validate-on');
  });

  test('its own props win, an explicit false included; describedby is joined; its id takes the label', () => {
    const html = renderToString(
      <Field ids={IDS} name="zone" label="Zone" description="Help" error="Pick" required disabled>
        <NativeSelect
          id="own"
          name="region"
          required={false}
          disabled={false}
          invalid={false}
          aria-describedby="note"
        >
          <option>EU</option>
        </NativeSelect>
      </Field>,
    );
    expect(html).toContain('for="own"');
    expect(html).toContain(
      '<select id="own" name="region" aria-describedby="d e note" class="nz-native-select-trigger"',
    );
  });

  test('under react-server: no client boundary at all', async () => {
    const {
      loaded: [field, select],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/field/field'),
          import('../../src/native-select/native-select'),
        ]),
      [FIELD_SCOPE],
    );
    const boundaries: ClientBoundary[] = [];
    const tree = JSON.stringify(
      withDispatcher(react, () =>
        serverRender(
          field.Field({
            label: 'Zone',
            children: <select.NativeSelect />,
          }),
          boundaries,
        ),
      ),
    );
    expect(boundaries).toEqual([]);
    expect(tree).toContain('"data-slot":"native-select-trigger"');
  });
});

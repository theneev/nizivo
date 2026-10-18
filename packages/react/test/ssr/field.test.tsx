// Field and Fieldset (ARCHITECTURE.md §10.6, §16.1; src/field/FIELD-CONTRACT.md): server-safety
// across the RSC boundary, SSR markup and the useFieldControl precedence rules. Hydration and native
// validation run in a browser: test/browser/field.spec.tsx.
import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  clientReference,
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
} from '../helpers/rsc';
import type { ClientBoundary } from '../helpers/rsc';
import { Field } from '../../src/field/field';
import { FieldStatic, type FieldStaticWiring } from '../../src/field/field-static';
import { Input } from '../../src/input/input.client';
import { NativeSelect } from '../../src/native-select/native-select';
import { Textarea } from '../../src/textarea/textarea.client';
import {
  useFieldControl,
  type FieldControl,
  type FieldControlOptions,
} from '../../src/field/field-scope.client';
import { FieldErrorExample, FieldExample, FieldZeroJsExample } from '../../src/field/field.example';
import { Fieldset } from '../../src/fieldset/fieldset';
import { FieldsetErrorExample, FieldsetExample } from '../../src/fieldset/fieldset.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const MANIFEST_TEXT: unknown = import.meta.glob('../../src/field/component.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})['../../src/field/component.json'];
const MANIFEST: { exports: string[] } = JSON.parse(
  typeof MANIFEST_TEXT === 'string' ? MANIFEST_TEXT : '{"exports":[]}',
);

const FIELD_SCOPE = {
  path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
  exports: ['FieldScope', 'useFieldControl'],
};
const INPUT = {
  path: new URL('../../src/input/input.client.tsx', import.meta.url).pathname,
  exports: ['Input'],
};
const CHECKBOX = {
  path: new URL('../../src/checkbox/checkbox.client.tsx', import.meta.url).pathname,
  exports: ['Checkbox'],
};

describe('module graph', () => {
  test('field: the subpath reaches exactly one client module, FieldScope; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/field/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/field/field-scope.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });

  test('field: every react import outside the client leaf exists under react-server', () => {
    const { modules } = graph(SRC, 'src/field/field.tsx');
    const server = [...modules].filter((file) => !isClient(SRC.get(file) ?? ''));
    expect(server).toContain('src/field/field.tsx');
    expect(reactImports(SRC, server).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('fieldset: no client module at all, and only react-server imports', () => {
    const { modules, externals } = graph(SRC, 'src/fieldset/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('FieldStatic: no client module in its graph, not even Field or FieldScope (M31)', () => {
    const { modules, externals } = graph(SRC, 'src/field/field-static.tsx');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect(modules).not.toContain('src/field/field.tsx');
    expect(modules).not.toContain('src/field/field-scope.client.tsx');
    // the anatomy's own parts: InlineError and the glyph, both server-safe
    expect(modules).toContain('src/inline-error/inline-error.tsx');
    expect(modules).toContain('src/_internal/glyphs.tsx');
    expect([...externals]).toEqual(['react']);
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the shared anatomy has one home: Field and FieldScope import it, it imports neither', () => {
    for (const file of ['src/field/field.tsx', 'src/field/field-scope.client.tsx']) {
      expect(graph(SRC, file).modules).toContain('src/field/field-static.tsx');
    }
    // the old cycle (FieldScope importing field.tsx, which imports FieldScope) is gone
    expect(graph(SRC, 'src/field/field-scope.client.tsx').modules).not.toContain(
      'src/field/field.tsx',
    );
  });
});

describe('react-server build, client leaves as client references', () => {
  test('field: the entry loads; the zero-JS example renders to host elements, no boundary', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () => Promise.all([import('../../src/field/index'), import('../../src/field/field.example')]),
      [FIELD_SCOPE, INPUT],
    );
    // component.json's exports, and nothing else (nz gen --check pins the barrel to that list)
    expect(Object.keys(entry)).toEqual(expect.arrayContaining(['Field', 'useFieldControl']));
    expect(Object.keys(entry).filter((name) => !MANIFEST.exports.includes(name))).toEqual([]);
    const zeroJs: ClientBoundary[] = [];
    const tree = JSON.stringify(
      withDispatcher(react, () => serverRender(examples.FieldZeroJsExample(), zeroJs)),
    );
    expect(tree).toContain('"data-slot":"field"');
    expect(tree).toContain('"data-slot":"field-label"');
    expect(tree).toContain('"data-slot":"native-select-trigger"');
    expect(zeroJs).toEqual([]);
    // around a client Input: FieldScope, then the Input, each with serialisable props only
    for (const Example of [examples.FieldExample, examples.FieldErrorExample]) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((boundary) => boundary.client)).toEqual(['FieldScope', 'Input']);
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });

  test('field: around a client control, only serialisable props cross to FieldScope', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/field/field'),
      [FIELD_SCOPE],
    );
    const Control = clientReference('Control');
    const boundaries: ClientBoundary[] = [];
    withDispatcher(react, () =>
      serverRender(
        loaded.Field({
          label: 'Product title',
          description: 'Shown on product pages.',
          error: <strong>Enter a title</strong>,
          required: true,
          messages: { valueMissing: 'Enter a title' },
          validateOn: 'blur',
          render: <section />,
          children: <Control />,
        }),
        boundaries,
      ),
    );
    expect(boundaries.map((boundary) => boundary.client)).toEqual(['FieldScope', 'Control']);
    const scope = boundaries[0]?.props ?? {};
    expect(unserialisable(scope)).toEqual([]);
    expect(scope).toMatchObject({
      anatomy: {
        ids: {
          control: '_S_1_-control',
          label: '_S_1_-label',
          description: '_S_1_-description',
          error: '_S_1_-error',
        },
        required: true,
        validateOn: 'blur',
      },
      messages: { valueMissing: 'Enter a title' },
    });
  });

  test('FieldStatic: loads under react-server with no client module mocked; host elements only', async () => {
    // Nothing is mocked: a client module in the graph would call createContext or useState, which
    // the react-server build does not have, and fail here.
    const { loaded, react } = await underReactServer(() =>
      Promise.all([
        import('../../src/field/field-static'),
        import('../../src/native-select/native-select'),
      ]),
    );
    const [{ FieldStatic: Static }, { NativeSelect: Select }] = loaded;
    const boundaries: ClientBoundary[] = [];
    const tree = JSON.stringify(
      withDispatcher(react, () =>
        serverRender(
          Static({
            label: 'Country',
            description: 'Where the order ships.',
            error: 'Choose a country.',
            required: true,
            children: (control) => (
              <Select {...control} name="country">
                <option value="IN">India</option>
              </Select>
            ),
          }),
          boundaries,
        ),
      ),
    );
    expect(boundaries).toEqual([]);
    for (const slot of ['field', 'field-label', 'field-description', 'field-error']) {
      expect(tree).toContain(`"data-slot":"${slot}"`);
    }
    expect(tree).toContain('"data-slot":"native-select-trigger"');
    expect(tree).not.toContain('aria-live');
  });

  test('fieldset: the entry loads; every example renders its rows as client Checkboxes', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/fieldset/index'),
          import('../../src/fieldset/fieldset.example'),
        ]),
      [FIELD_SCOPE, CHECKBOX],
    );
    expect(Object.keys(entry)).toEqual(['Fieldset']);
    expect(Object.keys(examples)).toHaveLength(3);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example(), boundaries)));
      expect(tree).toContain('"data-slot":"fieldset"');
      expect(new Set(boundaries.map((boundary) => boundary.client))).toEqual(new Set(['Checkbox']));
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

/** Renders a probe that records what useFieldControl returned. */
function probe(
  options: FieldControlOptions | undefined,
  wrap: (child: JSX.Element) => JSX.Element,
) {
  const seen: FieldControl[] = [];
  function Probe(): JSX.Element {
    const field = useFieldControl(options);
    seen.push(field);
    return <input {...field.controlProps} />;
  }
  const html = renderToString(wrap(<Probe />));
  const field = seen[0];
  if (field === undefined) throw new Error('the probe did not render');
  return { html, field };
}

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('Field markup', () => {
  test('group: the label names the group by id only, with no for, on both paths', () => {
    const client = renderToString(
      <Field label="Range" ids={{ label: 'l', control: 'c' }} group>
        <div role="radiogroup" aria-labelledby="l" />
      </Field>,
    );
    const zeroJs = renderToString(
      <Field label="Range" ids={{ label: 'l', control: 'c' }} group>
        {() => <div role="radiogroup" aria-labelledby="l" />}
      </Field>,
    );
    for (const html of [client, zeroJs]) {
      expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l">');
      expect(html).not.toContain('for=');
    }
    expect(
      renderToString(
        <Field label="Name" ids={{ control: 'c' }}>
          {() => <input />}
        </Field>,
      ),
    ).toContain('for="c"');
  });

  test('zero-JS: label, control, description; ids from the function child; no validate-on', () => {
    expect(
      renderToString(
        <Field ids={IDS} label="Product title" description="Shown on product pages." required>
          {(control) => <input {...control} />}
        </Field>,
      ),
    ).toBe(
      '<div data-slot="field" data-required="" class="nz-field">' +
        '<label class="nz-field-label" data-slot="field-label" id="l" for="c">Product title' +
        '<span class="nz-field-required" data-slot="field-required" aria-hidden="true">*</span></label>' +
        '<input id="c" required="" aria-describedby="d"/>' +
        '<div class="nz-field-description" data-slot="field-description" id="d">Shown on product pages.</div>' +
        '</div>',
    );
  });

  test('an error: InlineError as the field-error part, after the description, joined in order', () => {
    const html = renderToString(
      <Field ids={IDS} label="Price" description="In rupees." error="Enter a price above zero.">
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(html).toMatch(/^<div data-slot="field" data-invalid="" class="nz-field">/);
    expect(html).toContain('<input id="c" aria-describedby="d e" aria-invalid="true"/>');
    expect(html).toContain(
      '<div class="nz-field-description" data-slot="field-description" id="d">In rupees.</div>' +
        '<div data-slot="field-error" id="e" class="nz-inline-error nz-field-error">' +
        '<span class="nz-inline-error-icon" data-slot="inline-error-icon" aria-hidden="true">' +
        '<svg class="nz-glyph nz-glyph-circle-x"',
    );
    expect(html).toContain('Enter a price above zero.</span></div></div>');
    // not a live region (§16.5)
    expect(html).not.toMatch(/role="(alert|status)"|aria-live/);
  });

  test('false, null and empty errors present nothing and set no invalid state', () => {
    for (const error of [false, null, '', undefined]) {
      const html = renderToString(
        <Field ids={IDS} label="Price" error={error}>
          {(control) => <input {...control} />}
        </Field>,
      );
      expect(html).not.toContain('invalid');
      expect(html).not.toContain('field-error');
    }
  });

  test('errorIcon replaces the internal glyph', () => {
    const html = renderToString(
      <Field ids={IDS} label="Price" error="Too low" errorIcon={<i className="mine" />}>
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(html).toContain('<i class="mine"></i>');
    expect(html).not.toContain('nz-glyph-circle-x');
  });

  test('generated ids are stable and wire the label to the control', () => {
    for (const Example of [FieldZeroJsExample, FieldErrorExample]) {
      const html = renderToString(<Example />);
      const control = /<(?:input|select)[^>]* id="([^"]+)"/.exec(html)?.[1] ?? '';
      expect(control).toMatch(/-control$/);
      expect(html).toContain(`for="${control}"`);
      const base = control.replace(/-control$/, '');
      // the description first, then the error, then the control's own (Input's prefix)
      expect(html).toMatch(
        new RegExp(`aria-describedby="${base}-description( ${base}-error)?[ "]`),
      );
    }
    expect(renderToString(<FieldExample />)).toContain('placeholder="e.g. Stoneware mug"');
  });

  test('client control: FieldScope wires id, label, describedby, invalid, flags and validate-on', () => {
    const { html, field } = probe(undefined, (child) => (
      <Field
        ids={IDS}
        name="title"
        label="Title"
        description="Help"
        error="Enter a title"
        required
        disabled
        readOnly
      >
        {child}
      </Field>
    ));
    expect(html).toMatch(
      /^<div data-slot="field" data-disabled="" data-readonly="" data-required="" data-invalid="" data-validate-on="submit" class="nz-field">/,
    );
    expect(html).toContain(
      // React writes an input's name last
      '<input id="c" required="" disabled="" readOnly="" aria-describedby="d e" aria-invalid="true" name="title"/>',
    );
    expect(field).toMatchObject({
      inField: true,
      id: 'c',
      labelledBy: 'l',
      describedBy: 'd e',
      name: 'title',
      required: true,
      disabled: true,
      readOnly: true,
      invalid: true,
    });
    expect(typeof field.controlProps.onInvalid).toBe('function');
    expect(typeof field.controlProps.onInput).toBe('function');
    expect('onBlur' in field.controlProps).toBe(false);
  });

  test("client control: the announcer (§16.5) is the root's last child, after the error, empty", () => {
    const { html } = probe(undefined, (child) => (
      <Field ids={IDS} label="Title" error="Enter a title">
        {child}
      </Field>
    ));
    expect(html).toMatch(
      /Enter a title<\/span><\/div><span class="nz-visually-hidden" aria-live="polite" aria-atomic="true"><\/span><\/div>$/,
    );
    // one region, never on the error itself, and no alert or status role
    expect(html.match(/aria-live/g)).toHaveLength(1);
    expect(html).not.toMatch(/role="(alert|status)"/);
    // without an error it is there all the same: a live region must exist before its text does
    const { html: valid } = probe(undefined, (child) => <Field label="Title">{child}</Field>);
    expect(valid).toMatch(
      /<span class="nz-visually-hidden" aria-live="polite" aria-atomic="true"><\/span><\/div>$/,
    );
  });

  test('validateOn="blur" adds the blur handler and the attribute', () => {
    const { html, field } = probe(undefined, (child) => (
      <Field label="Email" validateOn="blur">
        {child}
      </Field>
    ));
    expect(html).toContain('data-validate-on="blur"');
    expect(typeof field.controlProps.onBlur).toBe('function');
  });

  test("precedence: the control's own props win, an explicit false included; describedby joins", () => {
    const { field, html } = probe(
      {
        id: 'own',
        name: 'own-name',
        disabled: false,
        invalid: false,
        'aria-describedby': 'count',
      },
      (child) => (
        <Field ids={IDS} name="title" label="Title" description="Help" error="Bad" disabled>
          {child}
        </Field>
      ),
    );
    expect(field).toMatchObject({
      id: 'own',
      name: 'own-name',
      disabled: false,
      invalid: false,
      describedBy: 'd e count',
    });
    expect(html).toContain('<input id="own" aria-describedby="d e count" name="own-name"/>');
  });

  test('no label: no label element and no labelledBy', () => {
    const { html, field } = probe(undefined, (child) => <Field ids={IDS}>{child}</Field>);
    expect(html).not.toContain('<label');
    expect(field.labelledBy).toBeUndefined();
  });

  test('no Field: values come from the options alone, with no handlers', () => {
    const bare = probe(undefined, (child) => child);
    expect(bare.field).toEqual({
      inField: false,
      id: undefined,
      labelledBy: undefined,
      describedBy: undefined,
      name: undefined,
      required: false,
      disabled: false,
      readOnly: false,
      invalid: false,
      controlProps: {},
    });
    expect(bare.html).toBe('<input/>');
    const own = probe(
      { id: 'x', required: true, invalid: true, 'aria-describedby': 'h' },
      (c) => c,
    );
    expect(own.html).toBe('<input id="x" required="" aria-describedby="h" aria-invalid="true"/>');
  });

  test("zero-JS: a spread after the consumer's own attributes never clears them", () => {
    const html = renderToString(
      <Field ids={IDS} label="Title">
        {(control) => <input name="title" required {...control} />}
      </Field>,
    );
    expect(html).toContain('<input required="" id="c" name="title"/>');
  });

  test('render composes the root and keeps the part slot', () => {
    const html = renderToString(
      <Field ids={IDS} label="Title" render={<section data-slot="other" className="mine" />}>
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(html).toMatch(/^<section data-slot="field" class="nz-field mine">/);
  });
});

const input = (control: object): JSX.Element => <input {...control} />;

/** Lines that only typecheck (`pnpm typecheck`): each misuse must be a compile error. */
const misuse = (): JSX.Element[] => [
  <FieldStatic key="1" label="Title">
    {/* @ts-expect-error -- an element placed directly: FieldStatic gives it no context */}
    <input />
  </FieldStatic>,
  // @ts-expect-error -- the control is required
  <FieldStatic key="2" label="Title" />,
  // @ts-expect-error -- nothing intercepts native validation, so there are no messages
  <FieldStatic key="3" label="Title" messages={{ valueMissing: 'Enter a title' }}>
    {input}
  </FieldStatic>,
  // @ts-expect-error -- nor a validateOn
  <FieldStatic key="4" label="Title" validateOn="blur">
    {input}
  </FieldStatic>,
];

describe('FieldStatic (M31): the function-child path as its own component', () => {
  const CASES: Array<[string, Record<string, unknown>]> = [
    ['label and description', { label: 'Title', description: 'Shown on product pages.' }],
    ['required', { label: 'Title', required: true }],
    ['an error', { label: 'Price', description: 'In rupees.', error: 'Enter a price.' }],
    ['disabled and read-only', { label: 'Title', disabled: true, readOnly: true }],
    ['group', { label: 'Range', group: true }],
    ['no label', { 'aria-label': 'Search' }],
    ['root attributes', { label: 'Title', className: 'mine', id: 'root', 'data-x': 'y' }],
    ['a name', { label: 'Title', name: 'title' }],
    ['errorIcon', { label: 'Price', error: 'Too low', errorIcon: <i className="mine" /> }],
  ];

  test.each(CASES)('%s: the same HTML as Field with a function child', (_, props) => {
    // given ids, and generated ones (each render starts its useId sequence afresh)
    for (const ids of [{ ids: IDS }, {}]) {
      const field = renderToString(
        <Field {...props} {...ids}>
          {input}
        </Field>,
      );
      const fieldStatic = renderToString(
        <FieldStatic {...props} {...ids}>
          {input}
        </FieldStatic>,
      );
      expect(fieldStatic).toBe(field);
      expect(fieldStatic).not.toMatch(/data-validate-on|aria-live/);
    }
  });

  test('the same HTML as a NativeSelect placed directly in a Field', () => {
    const options = <option value="IN">India</option>;
    expect(
      renderToString(
        <FieldStatic ids={IDS} label="Country" required>
          {(control) => (
            <NativeSelect name="country" {...control}>
              {options}
            </NativeSelect>
          )}
        </FieldStatic>,
      ),
    ).toBe(
      renderToString(
        <Field ids={IDS} label="Country" required>
          <NativeSelect name="country">{options}</NativeSelect>
        </Field>,
      ),
    );
  });

  test('the second argument: resolved ids, labelledBy, describedBy and the state', () => {
    const seen: FieldStaticWiring[] = [];
    const record = (wire: FieldStaticWiring): JSX.Element => {
      seen.push(wire);
      return <div role="radiogroup" aria-labelledby={wire.labelledBy} />;
    };
    const html = renderToString(
      <>
        <FieldStatic ids={IDS} label="Range" description="Days." error="Pick one." group required>
          {(_, field) => record(field)}
        </FieldStatic>
        <FieldStatic aria-label="Search">{(_, field) => record(field)}</FieldStatic>
      </>,
    );
    expect(seen[0]).toEqual({
      ids: IDS,
      labelledBy: 'l',
      describedBy: 'd e',
      invalid: true,
      required: true,
      disabled: false,
      readOnly: false,
    });
    // no label: no labelledBy; generated ids, the same shape Field's useId gives
    expect(seen[1]?.labelledBy).toBeUndefined();
    expect(seen[1]?.describedBy).toBeUndefined();
    expect(seen[1]?.ids.control).toMatch(/-control$/);
    expect(html).toContain('<div role="radiogroup" aria-labelledby="l"></div>');
    expect(html).not.toContain(' for=');
  });

  test('render composes the root and receives the Field state', () => {
    const states: unknown[] = [];
    const html = renderToString(
      <FieldStatic
        ids={IDS}
        label="Title"
        error="Required"
        render={(props, state) => {
          states.push(state);
          return <section {...props} />;
        }}
      >
        {input}
      </FieldStatic>,
    );
    expect(html).toMatch(/^<section data-slot="field" data-invalid="" class="nz-field">/);
    expect(states).toEqual([{ invalid: true, disabled: false, required: false, readOnly: false }]);
  });

  test('messages and validateOn from untyped code never reach the root element', () => {
    const untyped = { messages: { valueMissing: 'Enter a title' }, validateOn: 'blur' } as object;
    const html = renderToString(
      <FieldStatic ids={IDS} label="Title" {...untyped}>
        {input}
      </FieldStatic>,
    );
    expect(html).toMatch(/^<div data-slot="field" class="nz-field">/);
    expect(html).not.toMatch(/messages|validate/i);
  });

  test('misuse is a type error', () => {
    expect(misuse).toBeTypeOf('function');
  });

  test('an element child from untyped code fails with a message that says what to do', () => {
    expect(() =>
      renderToString(
        <FieldStatic label="Title">
          {/* @ts-expect-error -- what plain JavaScript can pass */}
          <input />
        </FieldStatic>,
      ),
    ).toThrow('FieldStatic: children must be a function; put an element in a Field');
  });

  test('a Nizivo Input or Textarea in the child shows the invalid state the wiring announces', () => {
    for (const html of [
      renderToString(
        <FieldStatic ids={IDS} label="Store name" error="Enter a store name">
          {(control) => <Input {...control} />}
        </FieldStatic>,
      ),
      renderToString(
        <FieldStatic ids={IDS} label="Notes" error="Enter a note">
          {(control) => <Textarea {...control} />}
        </FieldStatic>,
      ),
    ]) {
      // the control's own root (Input's box, the textarea itself) carries data-invalid, as in a Field
      expect(html).toMatch(/data-slot="(input|textarea)"/);
      expect(html).toMatch(/<(span|textarea)[^>]*data-invalid=""/);
      expect(html).toContain('aria-invalid="true"');
    }
    // an explicit invalid={false} still wins over the wiring
    expect(
      renderToString(
        <FieldStatic ids={IDS} label="Store name" error="Enter a store name">
          {(control) => <Input {...control} invalid={false} />}
        </FieldStatic>,
      ),
    ).not.toMatch(/data-slot="input"[^>]*data-invalid/);
  });
});

describe('Fieldset markup', () => {
  test('legend, then the rows box: children, description; describedby on the group', () => {
    expect(
      renderToString(
        <Fieldset legend="Notify me" description="Emails" ids={{ description: 'd', error: 'e' }}>
          <input type="checkbox" />
        </Fieldset>,
      ),
    ).toBe(
      '<fieldset data-slot="fieldset" class="nz-fieldset" aria-describedby="d">' +
        '<legend class="nz-fieldset-legend" data-slot="fieldset-legend">Notify me</legend>' +
        '<div class="nz-fieldset-content" data-slot="fieldset-content"><input type="checkbox"/>' +
        '<div class="nz-fieldset-description" data-slot="fieldset-description" id="d">Emails</div>' +
        '</div></fieldset>',
    );
  });

  test('error, required and disabled: native disabled, InlineError, consumer describedby joined', () => {
    const html = renderToString(
      <Fieldset
        legend="Delivery"
        description="Help"
        error="Choose one"
        required
        disabled
        aria-describedby="extra"
        ids={{ description: 'd', error: 'e' }}
      >
        <input type="radio" />
      </Fieldset>,
    );
    expect(html).toMatch(
      /^<fieldset data-slot="fieldset" data-disabled="" data-required="" data-invalid="" class="nz-fieldset" disabled="" aria-describedby="d e extra">/,
    );
    expect(html).toContain(
      '<span class="nz-fieldset-required" data-slot="fieldset-required" aria-hidden="true">*</span>',
    );
    expect(html).toContain(
      '<div data-slot="fieldset-error" id="e" class="nz-inline-error nz-fieldset-error">',
    );
    expect(html).not.toMatch(/aria-invalid|aria-required|role="(alert|status)"|aria-live/);
  });

  test('role="radiogroup" passes through for RadioGroup', () => {
    expect(renderToString(<Fieldset role="radiogroup" legend="Size" />)).toMatch(
      /^<fieldset data-slot="fieldset" role="radiogroup" class="nz-fieldset">/,
    );
  });

  test('render: no native disabled on another element; the part slot stays', () => {
    const html = renderToString(
      <Fieldset disabled render={<div className="group" />} legend="X" />,
    );
    expect(html).toMatch(/^<div class="nz-fieldset group" data-slot="fieldset" data-disabled="">/);
    expect(html).not.toMatch(/ disabled=""/);
  });

  test('the examples render', () => {
    expect(renderToString(<FieldsetExample />)).toContain('Notify me about');
    expect(renderToString(<FieldsetErrorExample />)).toContain('data-slot="fieldset-error"');
  });
});

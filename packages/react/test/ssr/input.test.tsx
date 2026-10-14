// Input (ARCHITECTURE.md §9.5, §16.1; src/field/FIELD-CONTRACT.md): a thin client leaf over a
// native <input>. Module graph, the RSC boundary, SSR markup, the Field wiring and its precedence.
// Hydration, the hit area and native validation run in a browser: test/browser/controls.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Field } from '../../src/field/field';
import { Input } from '../../src/input/input.client';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
  {
    path: new URL('../../src/input/input.client.tsx', import.meta.url).pathname,
    exports: ['Input'],
  },
];

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('module graph', () => {
  test('the subpath reaches two client modules, Input and FieldScope; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/input/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/field/field-scope.client.tsx',
      'src/input/input.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads, and every example crosses the boundary with serialisable props', async () => {
    const {
      loaded: [entry, loadedExamples],
      react,
    } = await underReactServer(
      () => Promise.all([import('../../src/input/index'), import('../../src/input/input.example')]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['Input']);
    expect(Object.keys(loadedExamples).toSorted()).toEqual([
      'InputExample',
      'InputSizesExample',
      'InputSlotsExample',
      'InputStatesExample',
    ]);
    for (const Example of Object.values(loadedExamples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('Input');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('standalone: the root box, the native input, default type and size', () => {
    expect(renderToString(<Input aria-label="Title" name="title" />)).toBe(
      '<span data-slot="input" data-size="md" class="nz-input">' +
        '<input aria-label="Title" type="text" class="nz-input-control" data-slot="input-control" name="title"/>' +
        '</span>',
    );
  });

  test('className and style go on the root; everything else on the <input>', () => {
    const html = renderToString(
      <Input
        className="wide"
        style={{ inlineSize: '100%' }}
        aria-label="Email"
        type="email"
        size="lg"
        autoComplete="email"
        defaultValue="a@b.c"
      />,
    );
    expect(html).toMatch(
      /^<span data-slot="input" data-size="lg" class="nz-input wide" style="inline-size:100%">/,
    );
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('value="a@b.c"');
  });

  test('icons are aria-hidden; text affixes get ids joined to aria-describedby after the own', () => {
    const html = renderToString(
      <Input
        aria-label="Price"
        aria-describedby="hint"
        leadingIcon={<i />}
        trailingIcon={<b />}
        prefix="₹"
        suffix="per kg"
      />,
    );
    const prefix = /data-slot="input-prefix" id="([^"]+)"/.exec(html)?.[1] ?? '';
    const suffix = /data-slot="input-suffix" id="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(prefix).toMatch(/-prefix$/);
    expect(suffix).toMatch(/-suffix$/);
    expect(html).toContain(`aria-describedby="hint ${prefix} ${suffix}"`);
    // DOM order: icon, prefix, input, suffix, icon
    const order = [...html.matchAll(/data-slot="(input-[a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([
      'input-icon',
      'input-prefix',
      'input-control',
      'input-suffix',
      'input-icon',
    ]);
    expect(
      html.match(/class="nz-input-icon" data-slot="input-icon" aria-hidden="true"/g),
    ).toHaveLength(2);
  });

  test('state attributes on the root, native attributes on the input', () => {
    const html = renderToString(
      <Input aria-label="Title" invalid disabled readOnly required size="sm" />,
    );
    expect(html).toMatch(
      /^<span data-slot="input" data-size="sm" data-disabled="" data-readonly="" data-invalid="" class="nz-input">/,
    );
    expect(html).toContain(
      '<input required="" disabled="" readOnly="" aria-invalid="true" aria-label="Title" type="text"',
    );
  });

  test('render composes the root; the part keeps its slot and size', () => {
    const html = renderToString(
      <Input aria-label="Title" size="sm" render={<div className="mine" data-slot="other" />} />,
    );
    expect(html).toMatch(/^<div class="nz-input mine" data-slot="input" data-size="sm">/);
    expect(html).toContain('class="nz-input-control"');
  });
});

describe('inside a Field', () => {
  test('label for = input id; describedby: description, error, own, affix; flags from the Field', () => {
    const html = renderToString(
      <Field
        ids={IDS}
        name="price"
        label="Price"
        description="In rupees."
        error="Enter a price above zero."
        required
      >
        <Input aria-describedby="own" suffix="per kg" />
      </Field>,
    );
    expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l" for="c">');
    const suffix = /data-slot="input-suffix" id="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(html).toContain(
      `<input id="c" required="" aria-describedby="d e own ${suffix}" aria-invalid="true"`,
    );
    expect(html).toContain('name="price"');
    expect(html).toMatch(
      /<span data-slot="input" data-size="md" data-invalid="" class="nz-input">/,
    );
  });

  test('the control’s own props win, an explicit false included', () => {
    const html = renderToString(
      <Field ids={IDS} label="Title" error="Wrong" disabled readOnly required name="field-name">
        <Input
          id="mine"
          name="mine"
          disabled={false}
          readOnly={false}
          required={false}
          invalid={false}
        />
      </Field>,
    );
    expect(html).toContain(
      '<input id="mine" aria-describedby="e" type="text" class="nz-input-control" data-slot="input-control" name="mine"/>',
    );
    expect(html).not.toMatch(/<input[^>]*(disabled|readOnly|required|aria-invalid)/);
    expect(html).toMatch(/<span data-slot="input" data-size="md" class="nz-input">/);
  });

  test('a disabled Field disables the input and marks the root', () => {
    const html = renderToString(
      <Field ids={IDS} label="Barcode" disabled>
        <Input />
      </Field>,
    );
    expect(html).toContain(
      '<span data-slot="input" data-size="md" data-disabled="" class="nz-input">',
    );
    expect(html).toContain('<input id="c" disabled=""');
  });

  test('the examples render, and every input has a name', async () => {
    // Imported here, not at the top: a static import keeps the example's Field on the default React
    // build, which the react-server test above would then call.
    const examples = await import('../../src/input/input.example');
    for (const Example of Object.values(examples)) {
      const html = renderToString(<Example />);
      for (const input of html.match(/<input[^>]*>/g) ?? []) {
        expect(input).toMatch(/aria-label="|id="/);
      }
    }
  });
});

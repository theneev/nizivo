// NumberField (ARCHITECTURE.md §16.1): server-safety across the RSC boundary and the server HTML: the
// box and its parts, the value formatted in the locale on the server, the hidden input's plain
// number, the step buttons' names and tab order, Field wiring, and no describedby id that points
// at nothing. Typing, committing and stepping run in a browser: test/browser/number-field.spec.tsx.
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
import { NizivoConfig } from '../../src/config/config.client';
import { Field } from '../../src/field/field';
import { NumberField } from '../../src/number-field/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
  {
    path: new URL('../../src/number-field/number-field.client.tsx', import.meta.url).pathname,
    exports: [
      'NumberFieldRoot',
      'NumberFieldInput',
      'NumberFieldDecrement',
      'NumberFieldIncrement',
    ],
  },
];

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

/** The opening tag of the element with this slot. */
function tag(html: string, slot: string): string {
  return new RegExp(`<(?:button|input|div)[^>]*data-slot="${slot}"[^>]*>`).exec(html)?.[0] ?? '';
}

describe('module graph', () => {
  test('the subpath reaches the parts, the adapter, FieldScope and the config; react and React Aria outside', () => {
    const { modules, externals } = graph(SRC, 'src/number-field/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/_engines/react-aria/locale.client.tsx',
      'src/_engines/react-aria/number-field.client.tsx',
      'src/config/config.client.tsx',
      'src/field/field-scope.client.tsx',
      'src/number-field/number-field.client.tsx',
    ]);
    expect([...externals].toSorted()).toEqual(['react', 'react-aria-components']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads, and every example crosses the boundary with serialisable props', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/number-field/index'),
          import('../../src/number-field/number-field.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry).toSorted()).toEqual([
      'NumberField',
      'NumberFieldDecrement',
      'NumberFieldIncrement',
      'NumberFieldInput',
      'NumberFieldRoot',
    ]);
    expect(Object.keys(examples).toSorted()).toEqual([
      'NumberFieldExample',
      'NumberFieldPercentExample',
      'NumberFieldStatesExample',
    ]);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('NumberFieldRoot');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('the box, then a text input React Aria owns, formatted on the server', () => {
    const html = renderToString(
      <NumberField.Root
        aria-label="Price"
        defaultValue={1234.5}
        formatOptions={{ style: 'currency', currency: 'EUR' }}
      >
        <NumberField.Input placeholder="0.00" />
      </NumberField.Root>,
    );
    expect(html).toMatch(
      /^<div class="nz-number-field nz-input" data-slot="number-field" data-size="md"><input /,
    );
    const input = tag(html, 'number-field-input');
    expect(input).toContain('type="text"');
    expect(input).toContain('aria-label="Price"');
    expect(input).toContain('value="€1,234.50"');
    expect(input).toContain('placeholder="0.00"');
    expect(input).toContain('class="nz-number-field-input nz-input-control"');
    // React Aria's own description and error ids are not rendered, so they are not referenced
    expect(input).not.toContain('aria-describedby');
    // no engine class or data-* reaches the DOM
    expect(html).not.toMatch(/react-aria-NumberField|data-rac|data-focused/);
  });

  test('the locale formats and the hidden input carries the plain number', () => {
    const html = renderToString(
      <NizivoConfig locale="de-DE">
        <NumberField.Root
          aria-label="Preis"
          name="price"
          defaultValue={1234.5}
          formatOptions={{ style: 'currency', currency: 'EUR' }}
        >
          <NumberField.Input />
        </NumberField.Root>
      </NizivoConfig>,
    );
    expect(tag(html, 'number-field-input')).toContain('value="1.234,50\u00a0€"');
    expect(html).toContain('<input type="hidden" name="price" value="1234.5"/>');
  });

  test('step buttons: out of the tab order, React Aria’s localized names, the internal glyphs', () => {
    const html = renderToString(
      <NumberField.Root aria-label="Stock" defaultValue={2}>
        <NumberField.Decrement />
        <NumberField.Input />
        <NumberField.Increment />
      </NumberField.Root>,
    );
    const minus = tag(html, 'number-field-decrement');
    const plus = tag(html, 'number-field-increment');
    const inputId = /\sid="([^"]+)"/.exec(tag(html, 'number-field-input'))?.[1] ?? '';
    expect(minus).toContain('tabindex="-1"');
    expect(minus).toContain('aria-label="Decrease Stock"');
    expect(minus).toContain(`aria-controls="${inputId}"`);
    expect(minus).toContain('class="nz-number-field-button nz-number-field-decrement"');
    expect(plus).toContain('aria-label="Increase Stock"');
    expect(html).toContain('<svg class="nz-glyph nz-glyph-minus"');
    expect(html).toContain('<svg class="nz-glyph nz-glyph-plus"');
    // decrement, input, increment: the reading order is the children's
    expect(html.indexOf('number-field-decrement')).toBeLessThan(html.indexOf('number-field-input'));
    expect(html.indexOf('number-field-input')).toBeLessThan(html.indexOf('number-field-increment'));
  });

  test('labels and children replace the names and the marks', () => {
    const html = renderToString(
      <NumberField.Root aria-label="Bestand" labels={{ decrement: 'Weniger', increment: 'Mehr' }}>
        <NumberField.Decrement>
          <i>-</i>
        </NumberField.Decrement>
        <NumberField.Input />
        <NumberField.Increment>
          <i>+</i>
        </NumberField.Increment>
      </NumberField.Root>,
    );
    expect(tag(html, 'number-field-decrement')).toContain('aria-label="Weniger"');
    expect(tag(html, 'number-field-increment')).toContain('aria-label="Mehr"');
    expect(html).not.toContain('nz-glyph');
    expect(html).toContain('aria-hidden="true"><i>-</i></span>');
  });

  test('size and className on the root; read-only and disabled', () => {
    const sized = renderToString(
      <NumberField.Root aria-label="N" size="sm" className="wide">
        <NumberField.Input />
      </NumberField.Root>,
    );
    expect(sized).toMatch(
      /^<div class="nz-number-field nz-input wide" data-slot="number-field" data-size="sm">/,
    );
    const readOnly = renderToString(
      <NumberField.Root aria-label="N" readOnly defaultValue={1}>
        <NumberField.Increment />
        <NumberField.Input />
      </NumberField.Root>,
    );
    expect(tag(readOnly, 'number-field')).toContain('data-readonly=""');
    expect(tag(readOnly, 'number-field-input')).toContain('readOnly=""');
    expect(tag(readOnly, 'number-field-increment')).toContain('disabled=""');
    const disabled = renderToString(
      <NumberField.Root aria-label="N" disabled>
        <NumberField.Input />
      </NumberField.Root>,
    );
    expect(tag(disabled, 'number-field')).toContain('data-disabled=""');
    expect(tag(disabled, 'number-field-input')).toContain('disabled=""');
  });
});

describe('inside a Field', () => {
  test('the label points at the input; description and error ids; the buttons end on the label', () => {
    const html = renderToString(
      <Field
        ids={IDS}
        name="price"
        label="Price"
        description="Before tax."
        error="Enter a price."
        required
      >
        <NumberField.Root>
          <NumberField.Decrement />
          <NumberField.Input />
          <NumberField.Increment />
        </NumberField.Root>
      </Field>,
    );
    expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l" for="c">');
    const input = tag(html, 'number-field-input');
    expect(input).toContain('id="c"');
    expect(input).toContain('required=""');
    expect(input).toContain('aria-labelledby="l"');
    expect(input).toContain('aria-describedby="d e"');
    expect(input).toContain('aria-invalid="true"');
    expect(tag(html, 'number-field')).toContain('data-invalid=""');
    expect(html).toContain('<input type="hidden" name="price" value=""/>');
    // "Decrease" + "Price": the button names itself, then the Field's label
    const minus = tag(html, 'number-field-decrement');
    const minusId = /\sid="([^"]+)"/.exec(minus)?.[1] ?? '';
    expect(minus).toContain('aria-label="Decrease"');
    expect(minus).toContain(`aria-labelledby="${minusId} l"`);
    expect(minus).toContain('aria-controls="c"');
  });

  test('a disabled Field disables the input and the buttons', () => {
    const html = renderToString(
      <Field ids={IDS} label="Price" disabled>
        <NumberField.Root>
          <NumberField.Decrement />
          <NumberField.Input />
        </NumberField.Root>
      </Field>,
    );
    expect(tag(html, 'number-field-input')).toContain('disabled=""');
    expect(tag(html, 'number-field-decrement')).toContain('disabled=""');
  });
});

// QuantityStepper (ARCHITECTURE.md §16.1): server-safety across the RSC boundary and the server HTML:
// a number input in Input's box between two buttons out of the tab order, their names and
// aria-controls, the ends of the range, the glyph slots, and Field wiring. Pressing, typing and the
// events run in a browser: test/browser/quantity-stepper.spec.tsx.
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
import { QuantityStepper } from '../../src/quantity-stepper/quantity-stepper.client';

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
    path: new URL('../../src/quantity-stepper/quantity-stepper.client.tsx', import.meta.url)
      .pathname,
    exports: ['QuantityStepper'],
  },
];

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('module graph', () => {
  test('the subpath reaches three client modules, QuantityStepper, FieldScope and the config; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/quantity-stepper/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/config/config.client.tsx',
      'src/field/field-scope.client.tsx',
      'src/quantity-stepper/quantity-stepper.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
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
          import('../../src/quantity-stepper/index'),
          import('../../src/quantity-stepper/quantity-stepper.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['QuantityStepper']);
    expect(Object.keys(examples).toSorted()).toEqual([
      'QuantityStepperExample',
      'QuantityStepperStatesExample',
    ]);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('QuantityStepper');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

/** The opening tag of the button with this slot. */
function button(html: string, slot: 'decrement' | 'increment'): string {
  return new RegExp(`<button[^>]*data-slot="quantity-stepper-${slot}"[^>]*>`).exec(html)?.[0] ?? '';
}

describe('markup', () => {
  test('standalone: Input’s box, minus, a numeric number input, plus', () => {
    const html = renderToString(<QuantityStepper aria-label="Quantity" name="qty" />);
    expect(html).toMatch(
      /^<span data-slot="quantity-stepper" data-size="md" class="nz-quantity-stepper nz-input"><button /,
    );
    const input = /<input [^>]*\/>/.exec(html)?.[0] ?? '';
    const id = /\sid="([^"]+)"/.exec(input)?.[1] ?? '';
    expect(id).not.toBe('');
    expect(input).toContain('inputMode="numeric"');
    expect(input).toContain('min="0"');
    expect(input).toContain('step="1"');
    expect(input).not.toContain('max=');
    expect(input).toContain('aria-label="Quantity"');
    expect(input).toContain('name="qty"');
    expect(input).toContain(
      'type="number" class="nz-quantity-stepper-control nz-input-control" data-slot="quantity-stepper-control"',
    );
    expect(button(html, 'decrement')).toBe(
      `<button type="button" tabindex="-1" aria-label="Decrease" aria-controls="${id}" class="nz-quantity-stepper-button nz-quantity-stepper-decrement" data-slot="quantity-stepper-decrement">`,
    );
    expect(button(html, 'increment')).toBe(
      `<button type="button" tabindex="-1" aria-label="Increase" aria-controls="${id}" class="nz-quantity-stepper-button nz-quantity-stepper-increment" data-slot="quantity-stepper-increment">`,
    );
    // minus, input, plus: the reading order matches the visual one
    expect(html.indexOf('quantity-stepper-decrement')).toBeLessThan(html.indexOf('<input'));
    expect(html.indexOf('<input')).toBeLessThan(html.indexOf('quantity-stepper-increment'));
  });

  test('the ends of the range disable their button; an empty input disables neither', () => {
    const atMin = renderToString(<QuantityStepper aria-label="Q" min={1} defaultValue={1} />);
    expect(button(atMin, 'decrement')).toContain(' disabled=""');
    expect(button(atMin, 'increment')).not.toContain('disabled');
    expect(atMin).toContain('value="1"');
    const atMax = renderToString(<QuantityStepper aria-label="Q" max={3} defaultValue={3} />);
    expect(button(atMax, 'increment')).toContain(' disabled=""');
    expect(button(atMax, 'decrement')).not.toContain('disabled');
    const controlled = renderToString(
      <QuantityStepper aria-label="Q" max={5} value={5} onValueChange={() => {}} />,
    );
    expect(button(controlled, 'increment')).toContain(' disabled=""');
    const empty = renderToString(<QuantityStepper aria-label="Q" min={1} max={3} />);
    expect(empty).not.toContain('disabled');
    expect(renderToString(<QuantityStepper aria-label="Q" value={null} />)).toContain('value=""');
  });

  test('the glyphs: minus and plus, aria-hidden; the icon slots and labels replace them', () => {
    const html = renderToString(<QuantityStepper aria-label="Q" />);
    expect(html).toContain(
      'data-slot="quantity-stepper-icon" aria-hidden="true"><svg class="nz-glyph nz-glyph-minus"',
    );
    expect(html).toContain(
      'data-slot="quantity-stepper-icon" aria-hidden="true"><svg class="nz-glyph nz-glyph-plus"',
    );
    const own = renderToString(
      <QuantityStepper
        aria-label="Menge"
        decrementIcon={<i>-</i>}
        incrementIcon={<i>+</i>}
        labels={{ decrement: 'Verringern', increment: 'Erhöhen' }}
      />,
    );
    expect(own).not.toContain('nz-glyph');
    expect(own).toContain('aria-hidden="true"><i>-</i></span>');
    expect(own).toContain('aria-hidden="true"><i>+</i></span>');
    expect(button(own, 'decrement')).toContain('aria-label="Verringern"');
    expect(button(own, 'increment')).toContain('aria-label="Erhöhen"');
  });

  test('read-only and disabled disable both buttons', () => {
    const readOnly = renderToString(<QuantityStepper aria-label="Q" defaultValue={2} readOnly />);
    expect(readOnly).toMatch(/^<span data-slot="quantity-stepper" data-size="md" data-readonly=""/);
    expect(button(readOnly, 'decrement')).toContain(' disabled=""');
    expect(button(readOnly, 'increment')).toContain(' disabled=""');
    const disabled = renderToString(<QuantityStepper aria-label="Q" disabled />);
    expect(button(disabled, 'decrement')).toContain(' disabled=""');
    expect(button(disabled, 'increment')).toContain(' disabled=""');
  });

  test('size, className and style on the root; render composes it', () => {
    const html = renderToString(
      <QuantityStepper aria-label="Q" size="sm" className="wide" style={{ inlineSize: '100%' }} />,
    );
    expect(html).toMatch(
      /^<span data-slot="quantity-stepper" data-size="sm" class="nz-quantity-stepper nz-input wide" style="inline-size:100%">/,
    );
    expect(
      renderToString(<QuantityStepper aria-label="Q" render={<div data-slot="other" />} />),
    ).toMatch(
      /^<div data-slot="quantity-stepper" data-size="md" class="nz-quantity-stepper nz-input">/,
    );
  });
});

describe('inside a Field', () => {
  test('the label points at the input; aria-controls is the Field’s id; flags from the Field', () => {
    const html = renderToString(
      <Field ids={IDS} name="quantity" label="Quantity" error="Choose 1 to 10." required>
        <QuantityStepper min={1} max={10} />
      </Field>,
    );
    expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l" for="c">');
    expect(html).toContain('<input id="c" required="" aria-describedby="e" aria-invalid="true"');
    expect(html).toContain('name="quantity"');
    expect(button(html, 'increment')).toContain('aria-controls="c"');
    expect(html).toMatch(/<span data-slot="quantity-stepper" data-size="md" data-invalid=""/);
  });

  test('a disabled Field disables the input and both buttons', () => {
    const html = renderToString(
      <Field ids={IDS} label="Quantity" disabled>
        <QuantityStepper />
      </Field>,
    );
    expect(html).toMatch(/<span data-slot="quantity-stepper" data-size="md" data-disabled=""/);
    expect(html).toMatch(/<input id="c" disabled=""/);
    expect(button(html, 'decrement')).toContain(' disabled=""');
    expect(button(html, 'increment')).toContain(' disabled=""');
  });
});

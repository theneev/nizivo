import type { JSX } from 'react';
import { Field } from '../field/index';
import { NumberField } from './index';

/** A price in euros: typed as "12.5", shown as "€12.50" on blur; the form gets 12.5. */
export function NumberFieldExample(): JSX.Element {
  return (
    <Field name="price" label="Price" description="Before tax." required>
      <NumberField.Root
        defaultValue={12.5}
        min={0}
        formatOptions={{ style: 'currency', currency: 'EUR' }}
      >
        <NumberField.Input />
      </NumberField.Root>
    </Field>
  );
}

/** A discount in percent, with step buttons: 5 % a step, 0 to 100 %. */
export function NumberFieldPercentExample(): JSX.Element {
  return (
    <Field name="discount" label="Discount">
      <NumberField.Root
        defaultValue={0.15}
        min={0}
        max={1}
        step={0.05}
        formatOptions={{ style: 'percent' }}
      >
        <NumberField.Decrement />
        <NumberField.Input />
        <NumberField.Increment />
      </NumberField.Root>
    </Field>
  );
}

/** Units and sizes, an error from the server, read-only and disabled. */
export function NumberFieldStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 320 }}>
      <Field label="Weight">
        <NumberField.Root
          defaultValue={1.2}
          formatOptions={{ style: 'unit', unit: 'kilogram', maximumFractionDigits: 2 }}
          size="sm"
        >
          <NumberField.Input />
        </NumberField.Root>
      </Field>
      <Field label="Stock" error="Stock cannot be below the 4 already ordered.">
        <NumberField.Root defaultValue={2} size="lg">
          <NumberField.Decrement />
          <NumberField.Input />
          <NumberField.Increment />
        </NumberField.Root>
      </Field>
      <Field label="Shipping" readOnly>
        <NumberField.Root defaultValue={4.9} formatOptions={{ style: 'currency', currency: 'USD' }}>
          <NumberField.Input />
        </NumberField.Root>
      </Field>
      <Field label="Tax rate" disabled>
        <NumberField.Root defaultValue={0.2} formatOptions={{ style: 'percent' }}>
          <NumberField.Input />
        </NumberField.Root>
      </Field>
    </div>
  );
}

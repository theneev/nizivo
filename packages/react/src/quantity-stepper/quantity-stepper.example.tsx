import type { JSX } from 'react';
import { Field } from '../field/index';
import { QuantityStepper } from './index';

/** A product page's quantity: 1 to 10, in a Field. The minus button is disabled at 1. */
export function QuantityStepperExample(): JSX.Element {
  return (
    <Field name="quantity" label="Quantity" description="Up to 10 per order.">
      <QuantityStepper min={1} max={10} defaultValue={1} />
    </Field>
  );
}

/** Sizes, a cart line at its stock limit, read-only, and disabled. */
export function QuantityStepperStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <QuantityStepper size="sm" aria-label="Small" defaultValue={2} />
      <QuantityStepper aria-label="Medium" defaultValue={2} />
      <QuantityStepper size="lg" aria-label="Large" defaultValue={2} />
      <Field label="Quantity" description="Only 3 left in stock.">
        <QuantityStepper min={1} max={3} defaultValue={3} />
      </Field>
      <QuantityStepper aria-label="Read-only" defaultValue={4} readOnly />
      <Field label="Quantity" disabled>
        <QuantityStepper defaultValue={1} />
      </Field>
    </div>
  );
}

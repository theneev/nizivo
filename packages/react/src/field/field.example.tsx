import type { JSX } from 'react';
import { Input } from '../input/index';
import { NativeSelect } from '../native-select/index';
import { Field } from './index';

/**
 * A client control inside a Field: Input reads the id, name, flags and description wiring through
 * `useFieldControl`, and a failed submit shows the browser's validation message inline.
 */
export function FieldExample(): JSX.Element {
  return (
    <Field
      label="Product title"
      description="Shown on product pages and checkout."
      required
      messages={{ valueMissing: 'Enter a product title.' }}
    >
      <Input name="title" placeholder="e.g. Stoneware mug" />
    </Field>
  );
}

/** An error returned by the server: icon and text under the help, joined to `aria-describedby`. */
export function FieldErrorExample(): JSX.Element {
  return (
    <Field label="Price" description="In rupees, before tax." error="Enter a price above zero.">
      <Input name="price" inputMode="decimal" defaultValue="0" prefix="₹" />
    </Field>
  );
}

/**
 * Zero JS: a NativeSelect placed in a Field, or any element through a function child
 * (`{(control) => <select {...control} />}`), is wired as plain attributes, so a Server Component
 * form ships no Field code for it.
 */
export function FieldZeroJsExample(): JSX.Element {
  return (
    <Field label="Country" description="Where the store ships from." required>
      <NativeSelect name="country" placeholder="Choose a country">
        <option value="IN">India</option>
        <option value="SG">Singapore</option>
        <option value="AE">United Arab Emirates</option>
      </NativeSelect>
    </Field>
  );
}

import type { JSX } from 'react';
import { Field } from '../field/index';
import { Fieldset } from '../fieldset/index';
import { Stack } from '../stack/index';
import { Checkbox } from './index';

/** A native checkbox: it submits `value` (default `"on"`) under `name`, even before hydration. */
export function CheckboxExample(): JSX.Element {
  return (
    <Checkbox name="track-inventory" defaultChecked>
      Track inventory
    </Checkbox>
  );
}

/** Unchecked, checked, mixed, disabled and invalid. A mixed box submits as unchecked. */
export function CheckboxStatesExample(): JSX.Element {
  return (
    <Stack gap="3">
      <Checkbox name="states" value="unchecked">
        Unchecked
      </Checkbox>
      <Checkbox name="states" value="checked" defaultChecked>
        Checked
      </Checkbox>
      <Checkbox name="states" value="mixed" defaultChecked="indeterminate">
        Some variants selected
      </Checkbox>
      <Checkbox name="states" value="disabled" disabled>
        Disabled
      </Checkbox>
      <Checkbox name="states" value="disabled-checked" disabled defaultChecked>
        Disabled and checked
      </Checkbox>
      <Checkbox name="states" value="invalid" invalid>
        Invalid
      </Checkbox>
    </Stack>
  );
}

/** A group of checkboxes is a Fieldset: the legend names the group. */
export function CheckboxGroupExample(): JSX.Element {
  return (
    <Fieldset legend="Notify me about" description="Emails go to the store owner.">
      <Checkbox name="notify" value="orders" defaultChecked>
        New orders
      </Checkbox>
      <Checkbox name="notify" value="stock">
        Low stock
      </Checkbox>
      <Checkbox name="notify" value="payouts" disabled>
        Payouts (needs a payment provider)
      </Checkbox>
    </Fieldset>
  );
}

/**
 * Inside a Field, the Field label asks the question and the checkbox label answers it; the Field's
 * description and error are joined to the box's `aria-describedby`.
 */
export function CheckboxFieldExample(): JSX.Element {
  return (
    <Field
      label="Terms of sale"
      description="Shown to buyers at checkout."
      error="Accept the terms to publish."
      required
    >
      <Checkbox name="terms">I accept the terms</Checkbox>
    </Field>
  );
}

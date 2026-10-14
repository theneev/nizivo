import type { JSX } from 'react';
import { Field } from '../field/index';
import { Fieldset } from '../fieldset/index';
import { Switch } from './index';

/** A native checkbox with `role="switch"`: it submits `value` (default `"on"`) while on. */
export function SwitchExample(): JSX.Element {
  return (
    <Switch name="online-store" defaultChecked>
      Online store
    </Switch>
  );
}

/** Settings that apply together sit in a Fieldset; off, on and both disabled states. */
export function SwitchStatesExample(): JSX.Element {
  return (
    <Fieldset legend="Billing emails" description="Sent to the billing contact.">
      <Switch name="billing" value="invoices" defaultChecked>
        Invoices
      </Switch>
      <Switch name="billing" value="usage">
        Usage reports
      </Switch>
      <Switch name="billing" value="failed" defaultChecked disabled>
        Failed payments (always on)
      </Switch>
      <Switch name="billing" value="digest" disabled>
        Weekly digest (unavailable)
      </Switch>
    </Fieldset>
  );
}

/** Inside a Field: the Field label and description name and describe the switch. */
export function SwitchFieldExample(): JSX.Element {
  return (
    <Field
      label="Wholesale"
      description="Show wholesale prices to approved buyers."
      error="Set a wholesale price list first."
    >
      <Switch name="wholesale">Enable wholesale</Switch>
    </Field>
  );
}

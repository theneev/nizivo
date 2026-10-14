import type { JSX } from 'react';
import { Checkbox } from '../checkbox/index';
import { Fieldset } from './index';

/** A checkbox group: the legend names it, the description is read on entering it. */
export function FieldsetExample(): JSX.Element {
  return (
    <Fieldset legend="Notify me about" description="Emails go to the store owner.">
      <Checkbox name="notify" value="orders" defaultChecked>
        New orders
      </Checkbox>
      <Checkbox name="notify" value="stock">
        Low stock
      </Checkbox>
    </Fieldset>
  );
}

/** An error returned by the server for the whole group, joined to the group's description. */
export function FieldsetErrorExample(): JSX.Element {
  return (
    <Fieldset legend="Sales channels" required error="Choose at least one channel.">
      <Checkbox name="channel" value="online">
        Online store
      </Checkbox>
      <Checkbox name="channel" value="pos">
        Point of sale
      </Checkbox>
    </Fieldset>
  );
}

/** Disabled: the native fieldset disables every control inside, with no client code. */
export function FieldsetDisabledExample(): JSX.Element {
  return (
    <Fieldset legend="Wholesale" description="Available on the Plus plan." disabled>
      <Checkbox name="wholesale" value="tiers">
        Tiered prices
      </Checkbox>
      <Checkbox name="wholesale" value="net30">
        Net 30 invoices
      </Checkbox>
    </Fieldset>
  );
}

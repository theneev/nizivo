import type { JSX } from 'react';
import { Field } from '../field/index';
import { Combobox } from './index';

/** A country in a checkout form: type to filter; the form gets the chosen code. */
export function ComboboxExample(): JSX.Element {
  return (
    <Field name="country" label="Country" description="Where we ship the order." required>
      <Combobox.Root>
        <Combobox.Input placeholder="Start typing" />
        <Combobox.Trigger />
        <Combobox.Popup>
          <Combobox.Item value="at">Austria</Combobox.Item>
          <Combobox.Item value="be">Belgium</Combobox.Item>
          <Combobox.Item value="de">Germany</Combobox.Item>
          <Combobox.Item value="fr">France</Combobox.Item>
          <Combobox.Item value="in">India</Combobox.Item>
          <Combobox.Item value="nl">Netherlands</Combobox.Item>
          <Combobox.Item value="gb">United Kingdom</Combobox.Item>
          <Combobox.Item value="us">United States</Combobox.Item>
        </Combobox.Popup>
      </Combobox.Root>
    </Field>
  );
}

/** Search suggestions, grouped, with any text allowed: the form gets what was typed. */
export function ComboboxSuggestionsExample(): JSX.Element {
  return (
    <Field name="q" label="Search products">
      <Combobox.Root allowsCustomValue>
        <Combobox.Input placeholder="Mugs, bowls, glaze…" />
        <Combobox.Popup>
          <Combobox.Group>
            <Combobox.GroupLabel>Recent</Combobox.GroupLabel>
            <Combobox.Item value="sand-mug">Sand mug</Combobox.Item>
          </Combobox.Group>
          <Combobox.Separator />
          <Combobox.Group>
            <Combobox.GroupLabel>Categories</Combobox.GroupLabel>
            <Combobox.Item value="mugs">Mugs</Combobox.Item>
            <Combobox.Item value="bowls">Bowls</Combobox.Item>
            <Combobox.Item value="plates">Plates</Combobox.Item>
          </Combobox.Group>
        </Combobox.Popup>
      </Combobox.Root>
    </Field>
  );
}

/** A chosen value, sizes, an error from the server and disabled. */
export function ComboboxStatesExample(): JSX.Element {
  const items = (
    <Combobox.Popup>
      <Combobox.Item value="standard">Standard</Combobox.Item>
      <Combobox.Item value="express">Express</Combobox.Item>
      <Combobox.Item value="pickup" disabled>
        Store pickup
      </Combobox.Item>
    </Combobox.Popup>
  );
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 320 }}>
      <Field label="Shipping">
        <Combobox.Root defaultValue="express" size="sm">
          <Combobox.Input />
          <Combobox.Trigger />
          {items}
        </Combobox.Root>
      </Field>
      <Field label="Shipping" error="Express is not available for this address.">
        <Combobox.Root defaultValue="express" size="lg">
          <Combobox.Input />
          <Combobox.Trigger />
          {items}
        </Combobox.Root>
      </Field>
      <Field label="Shipping" disabled>
        <Combobox.Root defaultValue="standard">
          <Combobox.Input />
          <Combobox.Trigger />
          {items}
        </Combobox.Root>
      </Field>
    </div>
  );
}

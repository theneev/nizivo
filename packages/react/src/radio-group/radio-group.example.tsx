import type { JSX } from 'react';
import { Radio, RadioGroup } from './index';

/** Native radios sharing one name: arrow keys move the choice, and the form submits it, with no JS. */
export function RadioGroupExample(): JSX.Element {
  return (
    <RadioGroup legend="Shipping" name="shipping" defaultValue="standard">
      <Radio value="standard">Standard shipping</Radio>
      <Radio value="express">Express shipping</Radio>
      <Radio value="pickup" disabled>
        Store pickup (no stores yet)
      </Radio>
    </RadioGroup>
  );
}

/** Horizontal, with a description. */
export function RadioGroupHorizontalExample(): JSX.Element {
  return (
    <RadioGroup
      legend="Weight unit"
      description="Used on packing slips."
      name="unit"
      defaultValue="kg"
      orientation="horizontal"
    >
      <Radio value="kg">Kilograms</Radio>
      <Radio value="lb">Pounds</Radio>
    </RadioGroup>
  );
}

/** Required, with an error from the server: `aria-invalid` and the message on the group. */
export function RadioGroupErrorExample(): JSX.Element {
  return (
    <RadioGroup legend="Tax category" name="tax" required error="Choose a tax category.">
      <Radio value="standard">Standard rate</Radio>
      <Radio value="reduced">Reduced rate</Radio>
      <Radio value="exempt">Exempt</Radio>
    </RadioGroup>
  );
}

/** The whole group disabled: the native fieldset disables every radio, with no client code. */
export function RadioGroupDisabledExample(): JSX.Element {
  return (
    <RadioGroup legend="Fulfilment" name="fulfilment" defaultValue="manual" disabled>
      <Radio value="manual">Manual</Radio>
      <Radio value="automatic">Automatic</Radio>
    </RadioGroup>
  );
}

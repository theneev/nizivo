'use client';
// The ONLY NumberField module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class
// names. React Aria parses and formats the number in the locale, clamps and snaps it on commit, and
// steps it with the arrow keys, Page Up / Page Down, Home / End and its step buttons; its hidden
// input carries the plain number into forms.
import type { JSX } from 'react';
import { Button, Input as EngineInput, NumberField } from 'react-aria-components';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  NumberFieldButtonState,
  NumberFieldEngine,
  NumberFieldInputState,
  NumberFieldRootState,
} from '../../number-field/number-field.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';

export const Root: NumberFieldEngine['Root'] = ({
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step,
  formatOptions,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  id,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  incrementLabel,
  decrementLabel,
  render,
  children,
  ...dom
}) => (
  <EngineLocale>
    <NumberField
      {...defined({
        // React Aria's empty value is NaN; ours is null
        value: value === null ? Number.NaN : value,
        defaultValue: defaultValue === null ? Number.NaN : defaultValue,
        minValue: min,
        maxValue: max,
        step,
        formatOptions,
        name,
        isRequired: required,
        isDisabled: disabled,
        isReadOnly: readOnly,
        isInvalid: invalid,
        id,
        'aria-label': label,
        'aria-labelledby': labelledBy,
        incrementAriaLabel: incrementLabel,
        decrementAriaLabel: decrementLabel,
      })}
      // React Aria reports no cause.
      onChange={(next) => onValueChange?.(Number.isNaN(next) ? null : next, details('unknown'))}
      // The input's own constraints (required) reach the Field's validation.
      validationBehavior="native"
      render={(p, rp) => {
        const s: NumberFieldRootState = {
          disabled: rp.isDisabled,
          readOnly: rp.isReadOnly,
          required: rp.isRequired,
          // presented only: the Field owns the message (§8.3)
          invalid: invalid === true,
        };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </NumberField>
  </EngineLocale>
);

export const Input: NumberFieldEngine['Input'] = ({ render, ...dom }) => (
  <EngineInput
    render={(p, rp) => {
      const s: NumberFieldInputState = {
        focusVisible: rp.isFocusVisible,
        disabled: rp.isDisabled,
      };
      // React Aria's describedby names its own description and error slots, which Nizivo never
      // renders (Field owns them): ids that point at nothing. The part passes the Field's ids.
      const { 'aria-describedby': _slots, ...engine } = engineDom(p);
      return render(mergeProps(engine, dom), s);
    }}
  />
);

function StepButton({
  slot,
  render,
  children,
  ...dom
}: Parameters<NumberFieldEngine['Increment']>[0] & {
  slot: 'increment' | 'decrement';
}): JSX.Element {
  // React Aria disables a button at its end of the range, and while disabled or read-only.
  return (
    <Button
      slot={slot}
      render={(p, rp) => {
        const s: NumberFieldButtonState = { pressed: rp.isPressed, disabled: rp.isDisabled };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </Button>
  );
}

export const Decrement: NumberFieldEngine['Decrement'] = (p) => (
  <StepButton {...p} slot="decrement" />
);

export const Increment: NumberFieldEngine['Increment'] = (p) => (
  <StepButton {...p} slot="increment" />
);

'use client';
// Switch: a native <input type="checkbox" role="switch"> in a thin client leaf (ARCHITECTURE.md
// §9.5, §16.1). The input is the track (appearance: none) and a sibling span is the thumb, so the
// on state paints and submits with no JavaScript. The leaf exists for Field wiring.
// Contract with Field: field/FIELD-CONTRACT.md.
import type { ChangeEvent, ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { useFieldControl } from '../field/field-scope.client';
import { cx } from '../_internal/cx';
import { presented } from '../_internal/field';

/** Every change comes from the native `change` event: a click, Space, or a click on the label. */
export type SwitchChangeReason = 'input';

/** What a `render` function receives for the root `<label>`. */
export interface SwitchState {
  /** An error message is presented (the Field's, or the `invalid` prop). */
  invalid: boolean;
  disabled: boolean;
  required: boolean;
}

export interface SwitchProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'role' | 'children' | 'readOnly' | 'size'
> {
  /** Controlled state: on or off. */
  checked?: boolean;
  /** Uncontrolled initial state. @default false */
  defaultChecked?: boolean;
  /** Called after the consumer's own `onChange`, unless it called `preventDefault()`. */
  onCheckedChange?: (checked: boolean, details: ChangeDetails<SwitchChangeReason>) => void;
  /** An error message is presented for this switch. Inside a Field, the Field decides. */
  invalid?: boolean;
  /** Composition of the root `<label>`, the hit target. */
  render?: RenderProp<SwitchState>;
  /** The label, after the track. Without one, name the switch with `aria-label`. */
  children?: ReactNode;
}

/**
 * `className` and `style` go on the root `<label>`; every other attribute, `ref` included, goes on the
 * native `<input>`. With `name`, the form submits `value` (default `"on"`) while the switch is on.
 */
export function Switch({
  id,
  name,
  required,
  disabled,
  invalid,
  'aria-describedby': describedBy,
  onCheckedChange,
  render,
  className,
  style,
  children,
  ...rest
}: SwitchProps): ReactElement {
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    invalid,
    'aria-describedby': describedBy,
  });
  // `readOnly` does nothing on a checkbox input (FIELD-CONTRACT.md rule 5): never spread it.
  const { readOnly: _readOnly, ...control } = field.controlProps;
  const own = {
    ...control,
    onChange(event: ChangeEvent<HTMLInputElement>) {
      onCheckedChange?.(event.currentTarget.checked, details('input', event.nativeEvent));
    },
  };

  const state: SwitchState = {
    invalid: field.invalid,
    disabled: field.disabled,
    required: field.required,
  };
  return renderElement('label', render, state, {
    'data-slot': 'switch',
    ...stateAttrs(state),
    className: cx('nz-switch nz-hit-target', className),
    style,
    children: (
      <>
        {/* consumer handlers run first; a prevented event skips ours and the Field's */}
        <input
          {...mergeProps(own, rest)}
          type="checkbox"
          // The native `checked` state is the switch state; ARIA in HTML forbids aria-checked here.
          // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="switch"
          className="nz-switch-input"
          data-slot="switch-input"
        />
        <span className="nz-switch-thumb" data-slot="switch-thumb" aria-hidden="true" />
        {presented(children) && (
          <span className="nz-switch-label" data-slot="switch-label">
            {children}
          </span>
        )}
      </>
    ),
  });
}

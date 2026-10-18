'use client';
// Input: a native <input> in a thin client leaf (ARCHITECTURE.md §9.5, §16.1 D20). It is a client
// module for one reason: it reads the Field's FieldScope context through useFieldControl, so the
// native validation message, aria-invalid and aria-describedby follow the Field. It keeps no state of
// its own, its server HTML is complete, and the input works before hydration.
import {
  useId,
  type ComponentPropsWithRef,
  type JSX,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { ControlSize } from '../augment';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { joinIds } from '../_internal/field';
import { useFieldControl } from '../field/field-scope.client';

/** Text-like input types; the others (checkbox, file, date, …) are other components. */
export type InputType = 'text' | 'email' | 'search' | 'password' | 'number' | 'tel' | 'url';

export interface InputState {
  size: ControlSize;
  /** An error message is presented (the Field's, or the `invalid` prop). */
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
}

export interface InputProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'prefix' | 'children'
> {
  /** @default 'text' */
  type?: InputType;
  /** 32 / 40 / 48 px, as Button and Select. @default 'md' */
  size?: ControlSize;
  /**
   * An error message is presented for this input (§8.3). Inside a Field, the Field sets it; an
   * explicit value here wins.
   */
  invalid?: boolean;
  /** Decorative icon before the value (`aria-hidden`). */
  leadingIcon?: ReactNode;
  /** Decorative icon after the value (`aria-hidden`). */
  trailingIcon?: ReactNode;
  /** Text before the value, such as a currency sign; joined to the input's `aria-describedby`. */
  prefix?: ReactNode;
  /** Text after the value, such as a unit; joined to the input's `aria-describedby`. */
  suffix?: ReactNode;
  /**
   * Composition of the root, the bordered box around the native `<input>`. `className` and `style`
   * go on the root too; every other prop, `ref` included, goes on the `<input>`.
   */
  render?: RenderProp<InputState>;
}

export function Input({
  type = 'text',
  size = 'md',
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  leadingIcon,
  trailingIcon,
  prefix,
  suffix,
  render,
  className,
  style,
  ...rest
}: InputProps): JSX.Element {
  const affix = useId();
  const prefixId = prefix == null ? undefined : `${affix}-prefix`;
  const suffixId = suffix == null ? undefined : `${affix}-suffix`;
  // No defaults on these: `undefined` inherits from the Field, `false` overrides it.
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    // One rule with the Field contract, as NativeSelect: an explicit `invalid` wins, else an
    // aria-invalid a FieldStatic (or Field's function child) passed.
    invalid: invalid ?? (ariaInvalid === true || ariaInvalid === 'true' ? true : undefined),
    'aria-describedby': joinIds(describedBy, prefixId, suffixId),
  });
  const state: InputState = {
    size,
    invalid: field.invalid,
    disabled: field.disabled,
    readOnly: field.readOnly,
  };
  return renderElement('span', render, state, {
    'data-slot': 'input',
    'data-size': size,
    ...stateAttrs({ invalid: state.invalid, disabled: state.disabled, readOnly: state.readOnly }),
    className: cx('nz-input', className),
    style,
    // The whole box is the input's hit area: a press on an icon, an affix or the padding focuses it.
    onMouseDown: focusInput,
    children: (
      <>
        {leadingIcon != null && (
          <span className="nz-input-icon" data-slot="input-icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        {prefix != null && (
          <span className="nz-input-prefix" data-slot="input-prefix" id={prefixId}>
            {prefix}
          </span>
        )}
        {/* consumer handlers run first; a prevented event skips the Field's */}
        <input
          {...mergeProps(field.controlProps, rest)}
          type={type}
          className="nz-input-control"
          data-slot="input-control"
        />
        {suffix != null && (
          <span className="nz-input-suffix" data-slot="input-suffix" id={suffixId}>
            {suffix}
          </span>
        )}
        {trailingIcon != null && (
          <span className="nz-input-icon" data-slot="input-icon" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </>
    ),
  });
}

function focusInput(event: MouseEvent<HTMLElement>): void {
  const input = event.currentTarget.querySelector<HTMLInputElement>(':scope > .nz-input-control');
  if (input === null || event.target === input || input.disabled) return;
  // Keep the caret where it is and avoid a blur/focus flicker, as a click on a native input does.
  event.preventDefault();
  input.focus();
}

'use client';
// RadioGroup's client leaf (ARCHITECTURE.md §9.5, §16.1): RadioGroupScope provides the group's name,
// value and callback; each Radio is a native <input type="radio"> inside its own <label>. The input
// is the visible circle (appearance: none), so :checked paints with no JavaScript.
import {
  createContext,
  use,
  useMemo,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { presented } from '../_internal/field';

interface Scope {
  name: string;
  value: string | null | undefined;
  defaultValue: string | undefined;
  required: boolean;
  onValueChange: ((value: string, details: ChangeDetails<'input'>) => void) | undefined;
}

const RadioGroupContext = createContext<Scope | null>(null);

/** Internal: rendered only by `RadioGroup`. Every prop but `onValueChange` is serialisable. */
export function RadioGroupScope({
  name,
  value,
  defaultValue,
  required,
  onValueChange,
  children,
}: Scope & { children: ReactNode }): ReactElement {
  const scope = useMemo<Scope>(
    () => ({ name, value, defaultValue, required, onValueChange }),
    [name, value, defaultValue, required, onValueChange],
  );
  return <RadioGroupContext value={scope}>{children}</RadioGroupContext>;
}

/** What a `render` function receives for the root `<label>`. */
export interface RadioState {
  disabled: boolean;
}

export interface RadioProps extends Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'name'
  | 'checked'
  | 'defaultChecked'
  | 'required'
  | 'readOnly'
  | 'children'
  | 'size'
> {
  /** Submitted under the group's name when this radio is checked. */
  value: string;
  /** Composition of the root `<label>`, the hit target. */
  render?: RenderProp<RadioState>;
  /** The label, after the circle. */
  children?: ReactNode;
}

/**
 * One option of a `RadioGroup`. `className` and `style` go on the root `<label>`; every other
 * attribute, `ref` included, goes on the native `<input>`. Name, checked state and `required` come
 * from the group.
 */
export function Radio({
  value,
  disabled,
  render,
  className,
  style,
  children,
  ...rest
}: RadioProps): ReactElement {
  const group = use(RadioGroupContext);
  const controlled = group !== null && group.value !== undefined;
  const own = {
    name: group?.name,
    required: group?.required === true ? true : undefined,
    disabled,
    checked: controlled ? group.value === value : undefined,
    defaultChecked:
      !controlled && group?.defaultValue !== undefined ? group.defaultValue === value : undefined,
    onChange(event: ChangeEvent<HTMLInputElement>) {
      if (event.currentTarget.checked) {
        group?.onValueChange?.(value, details('input', event.nativeEvent));
      }
    },
  };
  const state: RadioState = { disabled: disabled === true };
  return renderElement('label', render, state, {
    'data-slot': 'radio',
    ...stateAttrs(state),
    className: cx('nz-radio nz-hit-target', className),
    style,
    children: (
      <>
        {/* consumer handlers run first; a prevented change skips onValueChange */}
        <input
          {...mergeProps(own, rest)}
          type="radio"
          value={value}
          className="nz-radio-input"
          data-slot="radio-input"
        />
        {presented(children) && (
          <span className="nz-radio-label" data-slot="radio-label">
            {children}
          </span>
        )}
      </>
    ),
  });
}

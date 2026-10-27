'use client';
// QuantityStepper: a native `<input type="number">` for whole quantities in Input's box, between a
// minus and a plus button (ARCHITECTURE.md §16.1; Figma's Number Stepper 7367:377). The input is
// the spinbutton: Tab reaches only it, and Arrow Up / Arrow Down step it natively. The two buttons are for the pointer, so they are out of the tab order (`tabIndex={-1}`)
// and a press on one never moves focus; each steps the input with stepUp() / stepDown() and fires
// the native `input` and `change` events, so `onChange`, a form and a Field see a typed value. Each
// is disabled at its end of the range. Integers only: `step` is a whole number, and Field's
// `stepMismatch` message covers a typed fraction. Field wiring as Input (useFieldControl).
import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type InputEvent,
  type JSX,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { ControlSize } from '../augment';
import { useLabels } from '../config/config.client';
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { MinusGlyph, PlusGlyph } from '../_internal/glyphs';
import { useFieldControl } from '../field/field-scope.client';

/** QuantityStepper's own strings (§16.4): serialisable, English defaults. */
export interface QuantityStepperLabels {
  /** The minus button's name. @default 'Decrease quantity' */
  decrement: string;
  /** The plus button's name. @default 'Increase quantity' */
  increment: string;
}

/** `'decrement'` / `'increment'`: a button was pressed. `'input'`: typed, or an arrow key. */
export type QuantityStepperValueReason = 'decrement' | 'increment' | 'input';

export interface QuantityStepperState {
  size: ControlSize;
  /** An error message is presented (the Field's, or the `invalid` prop). */
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
  /** The value is at `min`: the minus button is disabled. */
  atMin: boolean;
  /** The value is at `max`: the plus button is disabled. */
  atMax: boolean;
}

export interface QuantityStepperProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'prefix' | 'children' | 'min' | 'max' | 'step' | 'value' | 'defaultValue'
> {
  /** 32 / 40 / 48 px, as Input. @default 'md' */
  size?: ControlSize;
  /** An error message is presented for this input. Inside a Field, the Field sets it. */
  invalid?: boolean;
  /** The lowest quantity; the minus button is disabled there. @default 0 */
  min?: number;
  /** The highest quantity; the plus button is disabled there. No limit by default. */
  max?: number;
  /** A whole number. @default 1 */
  step?: number;
  /** Controlled value; `null` is an empty input. Pair it with `onValueChange` or `onChange`. */
  value?: number | null;
  /** Uncontrolled starting value. */
  defaultValue?: number;
  /**
   * Called on every change, typed or pressed: the input's number, or `null` while it is empty or
   * not a number.
   */
  onValueChange?: (
    value: number | null,
    details: ChangeDetails<QuantityStepperValueReason>,
  ) => void;
  /** The minus button's mark. Defaults to the internal `minus` glyph. */
  decrementIcon?: ReactNode;
  /** The plus button's mark. Defaults to the internal `plus` glyph. */
  incrementIcon?: ReactNode;
  /** Overrides the buttons' names, for example `labels={{ increment: 'Erhöhen' }}`. */
  labels?: Partial<QuantityStepperLabels>;
  /**
   * Composition of the root, the bordered box. `className` and `style` go on the root too; every
   * other prop, `ref` included, goes on the `<input>`.
   */
  render?: RenderProp<QuantityStepperState>;
}

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function QuantityStepper({
  size = 'md',
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  min = 0,
  max,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  onInput,
  decrementIcon,
  incrementIcon,
  labels: labelsProp,
  render,
  className,
  style,
  ...rest
}: QuantityStepperProps): JSX.Element {
  const labels = useLabels('quantityStepper', labelsProp);
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid: invalid ?? (ariaInvalid === true || ariaInvalid === 'true' ? true : undefined),
    'aria-describedby': describedBy,
  });
  // The buttons' aria-controls needs the input's id, a Field's or our own.
  const own = useId();
  const inputId = field.id ?? own;
  const input = useRef<HTMLInputElement | null>(null);
  // What the buttons compare with min and max: the controlled value, else the last typed one.
  const [typed, setTyped] = useState<number | null>(defaultValue ?? null);
  const current = value === undefined ? typed : value;
  // The reason for the next `input` event: set by a button press just before it fires the event.
  const pressed = useRef<QuantityStepperValueReason | null>(null);

  const state: QuantityStepperState = {
    size,
    invalid: field.invalid,
    disabled: field.disabled,
    readOnly: field.readOnly,
    atMin: current !== null && current <= min,
    atMax: current !== null && max !== undefined && current >= max,
  };
  const locked = field.disabled || field.readOnly;

  const press = (direction: 'decrement' | 'increment'): void => {
    const element = input.current;
    if (element === null || element.disabled || element.readOnly) return;
    // An empty input steps from min (stepUp) or stays at min (stepDown), as the arrow keys do.
    if (element.value === '') element.value = String(min);
    else if (direction === 'increment') element.stepUp();
    else element.stepDown();
    pressed.current = direction;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const ownProps = {
    ...field.controlProps,
    id: inputId,
    ref: input,
    inputMode: 'numeric' as const,
    min,
    max,
    step,
    ...(value === undefined
      ? defaultValue !== undefined && { defaultValue }
      : { value: value ?? '' }),
    onInput: (event: InputEvent<HTMLInputElement>) => {
      onInput?.(event);
      const next = toNumber(event.currentTarget.value);
      setTyped(next);
      const reason = pressed.current ?? 'input';
      pressed.current = null;
      onValueChange?.(next, details(reason, event.nativeEvent));
    },
  };

  const names = {
    decrement: labels?.decrement ?? 'Decrease quantity',
    increment: labels?.increment ?? 'Increase quantity',
  };
  // Both buttons but their slot, class, handler, mark and end of the range.
  const buttonProps = (direction: 'decrement' | 'increment', off: boolean) => ({
    type: 'button' as const,
    tabIndex: -1,
    'aria-label': names[direction],
    'aria-controls': inputId,
    disabled: off || undefined,
    // the input keeps focus (or nothing takes it): the buttons are for the pointer
    onMouseDown: keepFocus,
  });

  return renderElement('span', render, state, {
    'data-slot': 'quantity-stepper',
    'data-size': size,
    ...stateAttrs({ invalid: state.invalid, disabled: state.disabled, readOnly: state.readOnly }),
    className: cx('nz-quantity-stepper nz-input', className),
    style,
    // A press on the box's edge (its border; the buttons fill the rest) focuses the input, as Input's
    // box does.
    onMouseDown: focusInput,
    children: (
      <>
        <button
          {...buttonProps('decrement', locked || state.atMin)}
          className="nz-quantity-stepper-button nz-quantity-stepper-decrement"
          data-slot="quantity-stepper-decrement"
          onClick={() => press('decrement')}
        >
          <span
            className="nz-quantity-stepper-icon"
            data-slot="quantity-stepper-icon"
            aria-hidden="true"
          >
            {decrementIcon ?? <MinusGlyph />}
          </span>
        </button>
        <input
          // mergeProps only composes the refs into one callback ref; nothing reads them in render.
          // eslint-disable-next-line react-hooks/refs -- one comment for oxlint and the react-hooks lane
          {...mergeProps(ownProps, rest)}
          type="number"
          className="nz-quantity-stepper-control nz-input-control"
          data-slot="quantity-stepper-control"
        />
        <button
          {...buttonProps('increment', locked || state.atMax)}
          className="nz-quantity-stepper-button nz-quantity-stepper-increment"
          data-slot="quantity-stepper-increment"
          onClick={() => press('increment')}
        >
          <span
            className="nz-quantity-stepper-icon"
            data-slot="quantity-stepper-icon"
            aria-hidden="true"
          >
            {incrementIcon ?? <PlusGlyph />}
          </span>
        </button>
      </>
    ),
  });
}

function keepFocus(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

function focusInput(event: MouseEvent<HTMLElement>): void {
  const input = event.currentTarget.querySelector<HTMLInputElement>(
    ':scope > .nz-quantity-stepper-control',
  );
  const target = event.target;
  if (input === null || target === input || input.disabled) return;
  if (target instanceof Element && target.closest('.nz-quantity-stepper-button') !== null) return;
  event.preventDefault();
  input.focus();
}

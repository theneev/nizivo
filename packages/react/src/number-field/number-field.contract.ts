// Public, engine-free types and the NumberFieldEngine interface (ARCHITECTURE.md §9.2, §16.1). NO
// directive. The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { ControlSize } from '../augment';
import type { ChangeDetails } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { EnginePart, RenderFn } from '../_internal/engine-part';

/** React Aria reports no cause for a change. */
export type NumberFieldValueReason = 'unknown';

/**
 * The step buttons' names (§9.3 rule 7). Unset, React Aria renders its own localized names, which
 * include the field's label ("Increase Price"; 36 locales), so they are not in the `enUS`
 * catalogue and `NizivoConfig` does not set them.
 */
export interface NumberFieldLabels {
  /** The Decrement button's name. */
  decrement: string;
  /** The Increment button's name. */
  increment: string;
}

export interface NumberFieldRootProps {
  /** Controlled value; `null` is an empty field. */
  value?: number | null;
  defaultValue?: number | null;
  /**
   * Called when the value is committed: on blur, Enter, a step button or an arrow key, after
   * parsing and clamping to `min` and `max`. `null` when the field is cleared.
   */
  onValueChange?: (value: number | null, details: ChangeDetails<NumberFieldValueReason>) => void;
  /** The lowest value: a typed lower number is clamped to it on commit. */
  min?: number;
  /** The highest value: a typed higher number is clamped to it on commit. */
  max?: number;
  /** The step of the arrow keys and step buttons; a committed value snaps to it. @default 1 */
  step?: number;
  /**
   * How the value is shown and parsed, as `Intl.NumberFormat` options: a currency
   * (`{ style: 'currency', currency: 'EUR' }`), a percent (`{ style: 'percent' }`, where 0.25 shows
   * as 25 %), a unit or fraction digits. The locale is NizivoConfig's (`en-US` by default).
   */
  formatOptions?: Intl.NumberFormatOptions;
  /**
   * With `name`, a hidden input carries the plain number (never the formatted text) into
   * `FormData`. Inside a `Field`, the Field's `name`, `required`, `disabled`, `readOnly` and
   * presented error apply unless set here (an explicit `false` wins).
   */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** An error message is presented (owned by Field, never by the engine). Inside a Field, the Field sets it. */
  invalid?: boolean;
  /** The input's id. Inside a Field, the Field's, which its label points at. */
  id?: string;
  'aria-label'?: string;
  /** Inside a Field, the Field label's id, so the step buttons' names include it. */
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** Overrides the step buttons' names, for example `labels={{ increment: 'Preis erhöhen' }}`. */
  labels?: Partial<NumberFieldLabels>;
  /** 32 / 40 / 48 px, as Input. @default 'md' */
  size?: ControlSize;
  className?: string;
  /** `NumberField.Input`, with `NumberField.Decrement` before it and `NumberField.Increment` after it to show step buttons. */
  children: ReactNode;
}

export interface NumberFieldRootState {
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
}

export interface NumberFieldInputState {
  focusVisible: boolean;
  disabled: boolean;
}

export interface NumberFieldButtonState {
  pressed: boolean;
  disabled: boolean;
}

export interface NumberFieldInputProps extends Omit<
  ComponentPropsWithRef<'input'>,
  | 'children'
  | 'value'
  | 'defaultValue'
  | 'type'
  | 'size'
  | 'min'
  | 'max'
  | 'step'
  | 'id'
  | 'name'
  | 'required'
  | 'disabled'
  | 'readOnly'
> {
  /** Must render an `<input>`. */
  render?: RenderProp<NumberFieldInputState>;
}

export interface NumberFieldButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'disabled' | 'type'
> {
  /** The button's mark; defaults to the internal `minus` or `plus` glyph. Decorative. */
  children?: ReactNode;
  /** Must render a `<button>`. */
  render?: RenderProp<NumberFieldButtonState>;
}

/**
 * What every NumberField adapter implements. Adapters write no class names: every class and
 * `data-slot` arrives in these props. The step buttons stay out of the tab order (the arrow keys
 * step the input), as React Aria renders them.
 */
export interface NumberFieldEngine {
  Root(
    p: Omit<NumberFieldRootProps, 'size' | 'labels' | 'aria-describedby'> & {
      incrementLabel?: string | undefined;
      decrementLabel?: string | undefined;
      render: RenderFn<NumberFieldRootState>;
    },
  ): ReactElement;
  Input(p: EnginePart<'input', NumberFieldInputState, 'id'>): ReactElement;
  Decrement(p: EnginePart<'button', NumberFieldButtonState>): ReactElement;
  Increment(p: EnginePart<'button', NumberFieldButtonState>): ReactElement;
}

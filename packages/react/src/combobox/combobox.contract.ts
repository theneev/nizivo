// Public, engine-free types and the ComboboxEngine interface (ARCHITECTURE.md §9.2, §16.1). NO
// directive. The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, CSSProperties, ReactElement, ReactNode } from 'react';
import type { ControlSize } from '../augment';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { Align, Side } from '../contracts/state';
import type { EnginePart, RenderFn } from '../_internal/engine-part';

export type { OpenReason };
/** React Aria reports no cause for a change. */
export type ComboboxValueReason = 'unknown';

/**
 * When the list opens. `'input'`: as the reader types (the default). `'focus'`: also when the
 * input takes focus, showing every item. `'manual'`: only from the Trigger or Arrow Down / Up.
 */
export type ComboboxMenuTrigger = 'input' | 'focus' | 'manual';

export interface ComboboxRootProps {
  /** The chosen item's `value`; `null` is none. */
  value?: string | null;
  defaultValue?: string | null;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onValueChange?: (value: string | null, details: ChangeDetails<ComboboxValueReason>) => void;
  /** The text in the input (controlled). */
  inputValue?: string;
  defaultInputValue?: string;
  /** Every change of the text: typed, cleared, or set to the chosen item's text. */
  onInputChange?: (inputValue: string) => void;
  /**
   * Open on the first render, showing every item. React Aria keeps the open state itself, so there
   * is no controlled `open`; `onOpenChange` reports each change.
   */
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  /**
   * The text may be any value, not only an item's: on blur it stays as typed, and a form submits
   * the text instead of the chosen item's `value`. @default false
   */
  allowsCustomValue?: boolean;
  /** @default 'input' */
  menuTrigger?: ComboboxMenuTrigger;
  /**
   * With `name`, a hidden input carries the chosen item's `value` into `FormData` (the text, with
   * `allowsCustomValue`). Inside a `Field`, the Field's `name`, `required`, `disabled`, `readOnly`
   * and presented error apply unless set here (an explicit `false` wins).
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
  /** Inside a Field, the Field label's id, which also names the list and the Trigger. */
  'aria-labelledby'?: string;
  /** 32 / 40 / 48 px, as Input. @default 'md' */
  size?: ControlSize;
  className?: string;
  /** `Combobox.Input`, an optional `Combobox.Trigger`, and `Combobox.Popup` with the items. */
  children: ReactNode;
}

export interface ComboboxRootState {
  open: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
}

export interface ComboboxInputState {
  /** The list is open (`data-open` on the input, as on a trigger). */
  open: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface ComboboxTriggerState {
  open: boolean;
  pressed: boolean;
  disabled: boolean;
}

export interface ComboboxPopupState {
  entering: boolean;
  exiting: boolean;
  side: Side;
}

export interface ComboboxItemState {
  /** Under the pointer, or the active item of the keyboard (the input keeps focus). */
  highlighted: boolean;
  selected: boolean;
  disabled: boolean;
  focusVisible: boolean;
}

export interface ComboboxInputProps extends Omit<
  ComponentPropsWithRef<'input'>,
  | 'children'
  | 'value'
  | 'defaultValue'
  | 'type'
  | 'size'
  | 'id'
  | 'name'
  | 'required'
  | 'disabled'
  | 'readOnly'
> {
  /** Must render an `<input>`. */
  render?: RenderProp<ComboboxInputState>;
}

export interface ComboboxTriggerProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'disabled' | 'type'
> {
  /** Replaces the chevron glyph. Decorative. */
  children?: ReactNode;
  /** Must render a `<button>`. */
  render?: RenderProp<ComboboxTriggerState>;
}

export interface ComboboxPopupProps {
  /** @default 'bottom' */
  side?: 'top' | 'bottom';
  /** @default 'start' */
  align?: Align;
  /** Distance from the box in px. @default 4 */
  sideOffset?: number;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface ComboboxItemProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'id'> {
  value: string;
  /** The text the input shows and the filter matches; defaults to `children` when it is a string. */
  textValue?: string;
  disabled?: boolean;
  /** Replaces the check shown at the end of the chosen item; `null` shows none. Decorative. */
  indicator?: ReactNode;
  /** Must render a `<div>`. */
  render?: RenderProp<ComboboxItemState>;
  children: ReactNode;
}

type NoState = Record<string, never>;

export interface ComboboxGroupProps extends Omit<ComponentPropsWithRef<'section'>, 'id'> {
  /** Must render a `<section>`. */
  render?: RenderProp<NoState>;
}
export interface ComboboxGroupLabelProps extends Omit<ComponentPropsWithRef<'header'>, 'id'> {
  /** Must render a `<header>`. */
  render?: RenderProp<NoState>;
}
export interface ComboboxSeparatorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
}

/**
 * What every Combobox adapter implements; the overlay conformance suite runs against it. Adapters
 * write no class names: every class and `data-slot` arrives in these props. The Root renders the
 * box (`control`) around its children, so the popup lines up with the whole box.
 */
export interface ComboboxEngine {
  Root(
    p: Omit<ComboboxRootProps, 'size'> & {
      render: RenderFn<ComboboxRootState>;
      /** Class, `data-slot` and size for the box around the input and the Trigger. */
      control: Record<string, unknown>;
    },
  ): ReactElement;
  Input(p: EnginePart<'input', ComboboxInputState, 'id'>): ReactElement;
  Trigger(p: EnginePart<'button', ComboboxTriggerState>): ReactElement;
  Popup(
    p: EnginePart<'div', ComboboxPopupState> & {
      side: 'top' | 'bottom';
      align: Align;
      sideOffset: number;
      container?: Element | null | undefined;
      /** Class and `data-slot` for the internal listbox element. */
      list: Record<string, unknown>;
    },
  ): ReactElement;
  Item(
    p: EnginePart<'div', ComboboxItemState, 'id'> & {
      value: string;
      textValue?: string | undefined;
      disabled?: boolean | undefined;
    },
  ): ReactElement;
  Group(p: EnginePart<'section', NoState, 'id'>): ReactElement;
  GroupLabel(p: EnginePart<'header', NoState, 'id'>): ReactElement;
  Separator(p: EnginePart<'div', NoState>): ReactElement;
}

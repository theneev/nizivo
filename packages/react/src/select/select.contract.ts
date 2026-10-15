// Public, engine-free types and the SelectEngine interface (ARCHITECTURE.md §9.2, §10.3). NO directive.
// The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, CSSProperties, ReactElement, ReactNode } from 'react';
import type { ControlSize } from '../augment';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { Align, Side } from '../contracts/state';
import type { EnginePart, RenderFn } from '../_internal/engine-part';

export type { OpenReason };
export type SelectValueReason = 'item-press' | 'keyboard' | 'typeahead' | 'form-reset';

/**
 * Strings the engine renders (§9.3 rule 7). `placeholder` is passed to the engine.
 * Engine-owned with React Aria (not overridable): the visually hidden "Dismiss" buttons in the popup.
 */
export interface SelectLabels {
  /** Shown while no value is chosen. React Aria's default is its localized "Select an item". */
  placeholder: string;
}

export interface SelectRootProps {
  value?: string | null;
  defaultValue?: string | null;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onValueChange?: (value: string | null, details: ChangeDetails<SelectValueReason>) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  /**
   * With `name`, a hidden native `<select>` carries the value into `FormData`. Inside a `Field`, the
   * Field's `name`, `required`, `disabled` and presented error apply unless set here (an explicit
   * `false` wins), and a click on its label focuses the trigger without opening the listbox.
   */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** An error message is presented (owned by Field, never by the engine). Inside a Field, the Field sets it. */
  invalid?: boolean;
  placeholder?: SelectLabels['placeholder'];
  'aria-label'?: string;
  /** Names the trigger together with the value. Inside a Field, the Field label id goes here (§16.1). */
  'aria-labelledby'?: string;
  /** 32 / 40 / 48 px. @default 'md' */
  size?: ControlSize;
  className?: string;
  children: ReactNode;
}

export interface SelectRootState {
  open: boolean;
  disabled: boolean;
}

export interface SelectTriggerState {
  open: boolean;
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface SelectValueState {
  placeholder: boolean;
}

export interface SelectPopupState {
  entering: boolean;
  exiting: boolean;
  side: Side;
}

export interface SelectItemState {
  highlighted: boolean;
  selected: boolean;
  disabled: boolean;
  focusVisible: boolean;
}

export interface SelectTriggerProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'disabled' | 'type'
> {
  leadingIcon?: ReactNode;
  /** Replaces the chevron glyph. */
  indicator?: ReactNode;
  /** Must render a `<button>` (a component that renders one is fine). */
  render?: RenderProp<SelectTriggerState>;
  /** Replaces the default `Select.Value`. */
  children?: ReactNode;
}

export interface SelectValueProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Must render a `<span>`. */
  render?: RenderProp<SelectValueState>;
}

export interface SelectPopupProps {
  /** @default 'bottom' */
  side?: 'top' | 'bottom';
  /** @default 'start' */
  align?: Align;
  /** Distance from the trigger in px. @default 8 */
  sideOffset?: number;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface SelectItemProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'id'> {
  value: string;
  /** Typeahead text; defaults to `children` when it is a string. */
  textValue?: string;
  disabled?: boolean;
  /** Replaces the check shown at the end of the selected item; `null` shows none. Decorative. */
  indicator?: ReactNode;
  /** Must render a `<div>`. */
  render?: RenderProp<SelectItemState>;
  children: ReactNode;
}

type NoState = Record<string, never>;

export interface SelectGroupProps extends Omit<ComponentPropsWithRef<'section'>, 'id'> {
  /** Must render a `<section>`. */
  render?: RenderProp<NoState>;
}
export interface SelectGroupLabelProps extends Omit<ComponentPropsWithRef<'header'>, 'id'> {
  /** Must render a `<header>`. */
  render?: RenderProp<NoState>;
}
export interface SelectSeparatorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
}

/**
 * What every Select adapter implements; testkit's select conformance runs against it.
 * Adapters write no class names: every class and `data-slot` arrives in these props.
 * Element types follow what React Aria 1.22.1 renders: Group is a `<section>`, GroupLabel a `<header>`.
 */
export interface SelectEngine {
  Root(p: Omit<SelectRootProps, 'size'> & { render: RenderFn<SelectRootState> }): ReactElement;
  Trigger(p: EnginePart<'button', SelectTriggerState>): ReactElement;
  Value(p: EnginePart<'span', SelectValueState>): ReactElement;
  Popup(
    p: EnginePart<'div', SelectPopupState> & {
      side: 'top' | 'bottom';
      align: Align;
      sideOffset: number;
      container?: Element | null | undefined;
      /** Class and `data-slot` for the internal listbox element. */
      list: Record<string, unknown>;
    },
  ): ReactElement;
  Item(
    p: EnginePart<'div', SelectItemState, 'id'> & {
      value: string;
      textValue?: string | undefined;
      disabled?: boolean | undefined;
    },
  ): ReactElement;
  Group(p: EnginePart<'section', NoState, 'id'>): ReactElement;
  GroupLabel(p: EnginePart<'header', NoState, 'id'>): ReactElement;
  Separator(p: EnginePart<'div', NoState>): ReactElement;
}

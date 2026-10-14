'use client';
// SegmentedControl (ARCHITECTURE.md §9.5, §8.5; figma/12 §4.7): one value from a few, as a native radio
// group. Each item is a <label> around a visually hidden <input type="radio">, so the browser gives the
// APG radio-group keyboard (arrows move and select, Tab enters at the checked radio), form submission,
// form.reset() and validation, and the server HTML works before hydration. It changes a value, not a
// view: views are Tabs.
import {
  createContext,
  use,
  useId,
  useMemo,
  type ChangeEvent,
  type FocusEvent,
  type ComponentPropsWithRef,
  type JSX,
  type ReactNode,
} from 'react';
import type { ControlSize } from '../augment';
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { useFieldControl } from '../field/field-scope.client';

/** Why the value changed: the user checked a radio (a pointer or a key; the browser does not say). */
export type SegmentedControlChangeReason = 'input';

export interface SegmentedControlRootState {
  size: ControlSize;
  disabled: boolean;
  invalid: boolean;
}

export interface SegmentedControlRootProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'role'
> {
  /** Controlled: the selected item's `value`, or `null` for none. */
  value?: string | null;
  /** The item selected at first (uncontrolled; `form.reset()` returns to it). */
  defaultValue?: string;
  /**
   * Called when the user selects an item. `details.reason` is `'input'` (as on RadioGroup and
   * Checkbox); `details.event` is the native `change` event.
   */
  onValueChange?: (value: string, details: ChangeDetails<SegmentedControlChangeReason>) => void;
  /**
   * The radios' shared name, and the `FormData` key. Without one (and outside a named Field), a
   * generated name groups the radios.
   */
  name?: string;
  /** The `<form>` the radios belong to, when they are outside it. */
  form?: string;
  required?: boolean;
  /** Disables every item. */
  disabled?: boolean;
  /** An error message is presented (set by a Field). */
  invalid?: boolean;
  /** 32 / 40 / 48 px track. @default 'md' */
  size?: ControlSize;
  /** Stretches the track to its container and shares the width equally between items. @default false */
  fullWidth?: boolean;
  render?: RenderProp<SegmentedControlRootState>;
  children?: ReactNode;
}

export interface SegmentedControlItemState {
  disabled: boolean;
}

export interface SegmentedControlItemProps extends Omit<
  ComponentPropsWithRef<'label'>,
  'htmlFor' | 'aria-label'
> {
  /** This item's value: what `onValueChange` receives and the form submits. */
  value: string;
  disabled?: boolean;
  /** A decorative glyph before the text (16 px). */
  icon?: ReactNode;
  /**
   * Names an icon-only item (no `children`): it goes on the radio, which is what assistive
   * technology announces.
   */
  'aria-label'?: string;
  render?: RenderProp<SegmentedControlItemState>;
  children?: ReactNode;
}

interface Group {
  name: string;
  value: string | null | undefined;
  defaultValue: string | undefined;
  disabled: boolean;
  /** Spread on every radio: `required`, `form` and the Field's validation handlers. */
  radio: Record<string, unknown>;
  onValueChange: SegmentedControlRootProps['onValueChange'];
}

const GroupContext = createContext<Group | null>(null);

/**
 * True while a radio's keydown is being handled. An arrow key moves focus to the next radio as the
 * keydown's default action, in the same task, so a focus seen while this is set came from a key.
 */
let keyDown = false;

function onKeyDown(): void {
  keyDown = true;
  setTimeout(() => {
    keyDown = false;
  }, 0);
}

/**
 * WebKit does not match :focus-visible on a radio reached with an arrow key, so the item marks a
 * keyboard focus itself (nz.base draws the outline for `[data-focus-visible]`). Written on the DOM,
 * not through state: re-rendering a focused radio makes React re-write its `name`, and Chromium then
 * stops treating an unchecked group as one Tab stop.
 */
function markFocus(event: FocusEvent<HTMLInputElement>): void {
  const visible = event.currentTarget.matches(':focus-visible') || keyDown;
  event.currentTarget
    .closest('.nz-segmented-control-item')
    ?.toggleAttribute('data-focus-visible', visible);
}

function clearFocus(event: FocusEvent<HTMLInputElement>): void {
  event.currentTarget.closest('.nz-segmented-control-item')?.removeAttribute('data-focus-visible');
}

export function SegmentedControlRoot({
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  required,
  disabled,
  invalid,
  size = 'md',
  fullWidth = false,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
  render,
  className,
  children,
  ...rest
}: SegmentedControlRootProps): JSX.Element {
  // A group control (FIELD-CONTRACT.md "Group controls"): the root is named and described by the Field;
  // every radio gets the name, `required`, `disabled` and the handlers, never the id.
  const field = useFieldControl({
    name,
    required,
    disabled,
    invalid,
    'aria-describedby': describedBy,
  });
  const generated = useId();
  const { required: radioRequired, onInvalid, onInput, onBlur } = field.controlProps;
  const groupName = field.name ?? generated;
  const group = useMemo<Group>(
    () => ({
      name: groupName,
      value,
      defaultValue,
      disabled: field.disabled,
      radio: definedProps({ required: radioRequired, form, onInvalid, onInput, onBlur }),
      onValueChange,
    }),
    [
      groupName,
      value,
      defaultValue,
      field.disabled,
      radioRequired,
      form,
      onInvalid,
      onInput,
      onBlur,
      onValueChange,
    ],
  );
  return (
    <GroupContext value={group}>
      {renderElement(
        'div',
        render,
        { size, disabled: field.disabled, invalid: field.invalid },
        {
          'data-slot': 'segmented-control',
          'data-size': size,
          'data-full-width': fullWidth ? '' : undefined,
          ...stateAttrs({
            disabled: field.disabled,
            invalid: field.invalid,
            required: field.required,
          }),
          ...rest,
          role: 'radiogroup',
          'aria-labelledby': labelledBy ?? field.labelledBy,
          'aria-describedby': field.describedBy,
          'aria-invalid': field.invalid ? true : undefined,
          'aria-required': field.required ? true : undefined,
          className: cx('nz-segmented-control', className),
          children,
        },
      )}
    </GroupContext>
  );
}

/** Drops `undefined` values, so a spread never writes an empty attribute or handler. */
function definedProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) if (value !== undefined) out[key] = value;
  return out;
}

export function SegmentedControlItem({
  value,
  disabled,
  icon,
  'aria-label': ariaLabel,
  render,
  className,
  children,
  ...rest
}: SegmentedControlItemProps): JSX.Element {
  const group = use(GroupContext);
  if (group === null) throw new Error('SegmentedControl.Item must be inside SegmentedControl.Root');
  const off = disabled === true || group.disabled;
  const checked =
    group.value === undefined
      ? { defaultChecked: group.defaultValue === value }
      : { checked: group.value === value };
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.currentTarget.checked)
      group.onValueChange?.(value, details('input', event.nativeEvent));
  };
  return renderElement(
    'label',
    render,
    { disabled: off },
    {
      'data-slot': 'segmented-control-item',
      ...stateAttrs({ disabled: off }),
      ...rest,
      className: cx('nz-segmented-control-item', className),
      children: (
        <>
          <input
            {...mergeProps(group.radio, {
              onChange,
              onFocus: markFocus,
              onBlur: clearFocus,
              onKeyDown,
            })}
            {...checked}
            type="radio"
            className="nz-segmented-control-input"
            data-slot="segmented-control-input"
            name={group.name}
            value={value}
            disabled={off || undefined}
            aria-label={ariaLabel}
          />
          {icon != null && (
            <span
              className="nz-segmented-control-icon"
              data-slot="segmented-control-icon"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          {children != null && (
            <span className="nz-segmented-control-label" data-slot="segmented-control-label">
              <span className="nz-segmented-control-text">{children}</span>
              {/* the selected weight's width, reserved so a selection never shifts its neighbours */}
              <span className="nz-segmented-control-sizer" aria-hidden="true">
                {children}
              </span>
            </span>
          )}
        </>
      ),
    },
  );
}

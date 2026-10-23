'use client';
// ChipGroup (Figma "Variant Option" 7275:14018, figma/05 §3.2; ARCHITECTURE.md §9.5, §16.1): a group of
// pill-shaped choices, such as a product's colours or sizes. Each Chip is a <label> around a visually
// hidden native input: radios for one value (the default), checkboxes with `multiple`. The browser
// gives the keyboard (arrows move and select within radios, Tab enters at the checked one; Space
// toggles a checkbox), form submission, form.reset() and validation, and the server HTML works before
// hydration. A group control: inside a Field, the Field takes `group` and names the root (D-s).
import {
  createContext,
  use,
  useId,
  useMemo,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type JSX,
  type ReactNode,
} from 'react';
import { useLabels } from '../config/config.client';
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { clearFocus, definedProps, markFocus, markKeyDown } from '../_internal/nested-focus';
import { useFieldControl } from '../field/field-scope.client';

/** Why the value changed: the user checked or cleared an input (a pointer or a key). */
export type ChipGroupChangeReason = 'input';

/** ChipGroup's own strings (§16.4): serialisable, English defaults. */
export interface ChipGroupLabels {
  /**
   * Describes an `unavailable` chip (out of stock), read after its name; the strike-through is
   * only visual. @default 'Unavailable'
   */
  unavailable: string;
}

export interface ChipGroupState {
  multiple: boolean;
  disabled: boolean;
  invalid: boolean;
}

/** What `onValueChange` receives: the checked value, or with `multiple` every checked value. */
export type ChipGroupValue<M extends boolean> = M extends true ? string[] : string;

/**
 * `M` is `true` when `multiple` is: TypeScript infers it from the prop, so `value`, `defaultValue`
 * and `onValueChange` take arrays exactly when the chips are checkboxes.
 */
export interface ChipGroupProps<M extends boolean = false> extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'role'
> {
  /**
   * Any number of values: native checkboxes under `role="group"`. Without it, one value: native
   * radios under `role="radiogroup"`. @default false
   */
  multiple?: M;
  /** Controlled: the checked chip's `value` (or `null` for none); with `multiple`, every one's. */
  value?: M extends true ? readonly string[] : string | null;
  /** The chip, or with `multiple` the chips, checked at first (`form.reset()` returns to them). */
  defaultValue?: M extends true ? readonly string[] : string;
  /**
   * Called when the user checks a chip (or, with `multiple`, checks or clears one), with every checked
   * value in document order; `details.event` is the native `change` event.
   */
  onValueChange?: (value: ChipGroupValue<M>, details: ChangeDetails<ChipGroupChangeReason>) => void;
  /**
   * A choice must be made before the form submits. One value only: on checkboxes the browser would
   * require every one.
   */
  required?: M extends true ? never : boolean;
  /**
   * The inputs' shared name, and the `FormData` key (a multiple group submits one entry per checked
   * chip). Without one (and outside a named Field), a generated name groups the inputs.
   */
  name?: string;
  /** The `<form>` the inputs belong to, when they are outside it. */
  form?: string;
  /** Disables every chip. */
  disabled?: boolean;
  /** An error message is presented (set by a Field). */
  invalid?: boolean;
  labels?: Partial<ChipGroupLabels>;
  render?: RenderProp<ChipGroupState>;
  /** `Chip` elements. */
  children?: ReactNode;
}

export interface ChipState {
  disabled: boolean;
  unavailable: boolean;
}

export interface ChipProps extends Omit<ComponentPropsWithRef<'label'>, 'htmlFor' | 'aria-label'> {
  /** This chip's value: what `onValueChange` receives and the form submits. */
  value: string;
  disabled?: boolean;
  /**
   * Out of stock, or otherwise not available: it keeps its colour, gets a strike-through and is
   * described as `labels.unavailable`. It can still be chosen (to show "Notify me", for example);
   * add `disabled` to stop that. @default false
   */
  unavailable?: boolean;
  /**
   * A swatch or glyph before the text (Figma Type=Colour), in a 24 px circle; decorative. A colour
   * is data: pass an element with that background, such as `<span style={{ background: '#2e5a3c' }} />`.
   */
  leading?: ReactNode;
  /** Names a chip with no text (a swatch only): it goes on the input, which is what is announced. */
  'aria-label'?: string;
  render?: RenderProp<ChipState>;
  children?: ReactNode;
}

interface Group {
  name: string;
  multiple: boolean;
  /** `{ checked }` when controlled, `{ defaultChecked }` otherwise. */
  checkedProps: (value: string) => { checked: boolean } | { defaultChecked: boolean };
  disabled: boolean;
  invalid: boolean;
  unavailable: string;
  /** Spread on every input: `required`, `form` and the Field's validation handlers. */
  input: Record<string, unknown>;
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
}

const GroupContext = createContext<Group | null>(null);

export function ChipGroup<M extends boolean = false>({
  multiple: multipleProp,
  value: valueProp,
  defaultValue: defaultValueProp,
  onValueChange: onValueChangeProp,
  name,
  form,
  required: requiredProp,
  disabled,
  invalid,
  labels: labelsProp,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
  render,
  className,
  children,
  ...rest
}: ChipGroupProps<M>): JSX.Element {
  const labels = useLabels('chipGroup', labelsProp);
  // The conditional types resolve once M is known; inside, both shapes are handled at run time.
  const multiple = multipleProp === true;
  const value: string | null | readonly string[] | undefined = valueProp;
  const defaultValue: string | readonly string[] | undefined = defaultValueProp;
  const required: boolean | undefined = requiredProp;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `multiple` decides the shape: an array exactly when M is true
  const onValueChange = onValueChangeProp as
    | ((value: string | string[], details: ChangeDetails<ChipGroupChangeReason>) => void)
    | undefined;
  const field = useFieldControl({
    name,
    required: multiple ? false : required,
    disabled,
    invalid,
    'aria-describedby': describedBy,
  });
  const generated = useId();
  const { required: inputRequired, onInvalid, onInput, onBlur } = field.controlProps;
  const groupName = field.name ?? generated;
  const unavailable = labels?.unavailable ?? 'Unavailable';
  const group = useMemo<Group>(() => {
    const controlled = value !== undefined;
    const has = (list: string | null | readonly string[] | undefined, item: string): boolean =>
      typeof list === 'string' ? list === item : list?.includes(item) === true;
    return {
      name: groupName,
      multiple,
      checkedProps: (item) =>
        controlled ? { checked: has(value, item) } : { defaultChecked: has(defaultValue, item) },
      disabled: field.disabled,
      invalid: field.invalid,
      unavailable,
      input: definedProps({
        required: multiple ? undefined : inputRequired,
        form,
        onInvalid,
        onInput,
        onBlur,
      }),
      onChange(item, event) {
        if (onValueChange === undefined) return;
        const target = event.currentTarget;
        if (!multiple) {
          if (target.checked) onValueChange(item, details('input', event.nativeEvent));
          return;
        }
        // Every checked chip of this group, in document order, as FormData lists them.
        const root = target.closest('[data-slot="chip-group"]');
        const checked = [
          ...(root?.querySelectorAll<HTMLInputElement>('input[data-slot="chip-input"]') ?? []),
        ]
          .filter((input) => input.name === groupName && input.checked)
          .map((input) => input.value);
        onValueChange(checked, details('input', event.nativeEvent));
      },
    };
  }, [
    groupName,
    multiple,
    value,
    defaultValue,
    field.disabled,
    field.invalid,
    unavailable,
    inputRequired,
    form,
    onInvalid,
    onInput,
    onBlur,
    onValueChange,
  ]);
  return (
    <GroupContext value={group}>
      {renderElement(
        'div',
        render,
        { multiple, disabled: field.disabled, invalid: field.invalid },
        {
          'data-slot': 'chip-group',
          ...stateAttrs({
            disabled: field.disabled,
            invalid: field.invalid,
            required: field.required,
          }),
          ...rest,
          // A radiogroup takes aria-required and aria-invalid; a group allows neither (ARIA 1.2), so
          // a multiple group marks each checkbox invalid instead.
          role: multiple ? 'group' : 'radiogroup',
          'aria-labelledby': labelledBy ?? field.labelledBy,
          'aria-describedby': field.describedBy,
          'aria-invalid': !multiple && field.invalid ? true : undefined,
          'aria-required': !multiple && field.required ? true : undefined,
          className: cx('nz-chip-group', className),
          children,
        },
      )}
    </GroupContext>
  );
}

export function Chip({
  value,
  disabled,
  unavailable = false,
  leading,
  'aria-label': ariaLabel,
  render,
  className,
  children,
  ...rest
}: ChipProps): JSX.Element {
  const group = use(GroupContext);
  if (group === null) throw new Error('Chip must be inside ChipGroup');
  const off = disabled === true || group.disabled;
  const noteId = useId();
  const strike = unavailable ? (
    <span className="nz-chip-strike" data-slot="chip-strike" aria-hidden="true" />
  ) : null;
  return renderElement(
    'label',
    render,
    { disabled: off, unavailable },
    {
      'data-slot': 'chip',
      ...stateAttrs({ disabled: off }),
      ...rest,
      className: cx('nz-chip', className),
      children: (
        <>
          <input
            {...mergeProps(group.input, {
              onChange: (event: ChangeEvent<HTMLInputElement>) => group.onChange(value, event),
              onFocus: markFocus,
              onBlur: clearFocus,
              onKeyDown: markKeyDown,
            })}
            {...group.checkedProps(value)}
            type={group.multiple ? 'checkbox' : 'radio'}
            className="nz-chip-input"
            data-slot="chip-input"
            name={group.name}
            value={value}
            disabled={off || undefined}
            aria-label={ariaLabel}
            aria-describedby={unavailable ? noteId : undefined}
            aria-invalid={group.multiple && group.invalid ? true : undefined}
          />
          {leading != null && (
            <span className="nz-chip-leading" data-slot="chip-leading" aria-hidden="true">
              {leading}
              {strike}
            </span>
          )}
          {children != null && (
            <span className="nz-chip-label" data-slot="chip-label">
              {children}
            </span>
          )}
          {leading == null && strike}
          {/* hidden: it describes the input (aria-describedby reads hidden text) without joining
              its name or being read again in browse mode */}
          {unavailable && (
            <span id={noteId} hidden>
              {group.unavailable}
            </span>
          )}
        </>
      ),
    },
  );
}

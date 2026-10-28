'use client';
// ChoiceCard (Figma "Payment Method" 7275:14174, figma/05 §3.6; ARCHITECTURE.md §9.5, §16.1): one
// option of a choice drawn as a card, such as a saved payment method or a delivery speed. Each card
// is a <label> around a real, visible native radio (Figma faked it with a thick-stroked ellipse), so
// the browser gives the keyboard (arrows move and select, Tab enters at the checked card), form
// submission, form.reset() and validation, and the server HTML works before hydration.
// ChoiceCardGroup is the group control: a root role="radiogroup" that, inside a Field, the Field takes
// with `group` and names (D-s). The Field's error marks the chosen card invalid (an expired or
// declined card) and describes the group.
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
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { clearFocus, definedProps, markFocus, markKeyDown } from '../_internal/nested-focus';
import { useFieldControl } from '../field/field-scope.client';

/** Why the value changed: the user checked a radio (a pointer or a key). */
export type ChoiceCardChangeReason = 'input';

export interface ChoiceCardGroupState {
  disabled: boolean;
  invalid: boolean;
}

export interface ChoiceCardGroupProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'role'
> {
  /** Controlled: the checked card's `value`, or `null` for none. */
  value?: string | null;
  /** The card checked at first (uncontrolled; `form.reset()` returns to it). */
  defaultValue?: string;
  /** Called when the user checks a card; `details.event` is the native `change` event. */
  onValueChange?: (value: string, details: ChangeDetails<ChoiceCardChangeReason>) => void;
  /**
   * The radios' shared name, and the `FormData` key. Without one (and outside a named Field), a
   * generated name groups the radios.
   */
  name?: string;
  /** The `<form>` the radios belong to, when they are outside it. */
  form?: string;
  /** A choice must be made before the form submits. */
  required?: boolean;
  /** Disables every card. */
  disabled?: boolean;
  /**
   * An error message is presented (set by a Field): the checked card, or every card when none is
   * checked, shows the critical edge.
   */
  invalid?: boolean;
  render?: RenderProp<ChoiceCardGroupState>;
  /** `ChoiceCard` elements, possibly with other content between them (an "Add" row). */
  children?: ReactNode;
}

export interface ChoiceCardState {
  disabled: boolean;
}

export interface ChoiceCardProps extends Omit<ComponentPropsWithRef<'label'>, 'htmlFor'> {
  /** This card's value: what `onValueChange` receives and the form submits. */
  value: string;
  disabled?: boolean;
  /**
   * A mark after the radio, such as a card brand's logo (44 × 30 px); decorative, so put
   * the brand's name in the text too.
   */
  leading?: ReactNode;
  /**
   * A second line, such as "Expires 08/28". It describes the radio (`aria-describedby`) instead of
   * joining its name.
   */
  description?: ReactNode;
  /**
   * Content at the card's end, such as a "Default" `Badge`: composition, not a
   * prop. Its text joins the radio's name, after `children`.
   */
  trailing?: ReactNode;
  render?: RenderProp<ChoiceCardState>;
  /** The radio's name, such as "Visa ending in 4242". */
  children: ReactNode;
}

interface Group {
  name: string;
  value: string | null | undefined;
  defaultValue: string | undefined;
  disabled: boolean;
  /** Spread on every radio: `required`, `form` and the Field's validation handlers. */
  radio: Record<string, unknown>;
  onValueChange: ChoiceCardGroupProps['onValueChange'];
}

const GroupContext = createContext<Group | null>(null);

export function ChoiceCardGroup({
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  required,
  disabled,
  invalid,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
  render,
  className,
  children,
  ...rest
}: ChoiceCardGroupProps): JSX.Element {
  // A group control (FIELD-CONTRACT.md "Group controls"): the root is named and described by the
  // Field; every radio gets the name, `required`, `disabled` and the handlers, never the id.
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
        { disabled: field.disabled, invalid: field.invalid },
        {
          'data-slot': 'choice-card-group',
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
          className: cx('nz-choice-card-group', className),
          children,
        },
      )}
    </GroupContext>
  );
}

export function ChoiceCard({
  value,
  disabled,
  leading,
  description,
  trailing,
  render,
  className,
  children,
  ...rest
}: ChoiceCardProps): JSX.Element {
  const group = use(GroupContext);
  if (group === null) throw new Error('ChoiceCard must be inside ChoiceCardGroup');
  const off = disabled === true || group.disabled;
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = description == null ? undefined : `${id}-description`;
  const trailingId = trailing == null ? undefined : `${id}-trailing`;
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
      'data-slot': 'choice-card',
      ...stateAttrs({ disabled: off }),
      ...rest,
      className: cx('nz-choice-card', className),
      children: (
        <>
          <input
            {...mergeProps(group.radio, {
              onChange,
              onFocus: markFocus,
              onBlur: clearFocus,
              onKeyDown: markKeyDown,
            })}
            {...checked}
            type="radio"
            className="nz-choice-card-input"
            data-slot="choice-card-input"
            name={group.name}
            value={value}
            disabled={off || undefined}
            aria-labelledby={trailingId === undefined ? labelId : `${labelId} ${trailingId}`}
            aria-describedby={descriptionId}
          />
          {leading != null && (
            <span
              className="nz-choice-card-leading"
              data-slot="choice-card-leading"
              aria-hidden="true"
            >
              {leading}
            </span>
          )}
          <span className="nz-choice-card-content" data-slot="choice-card-content">
            <span className="nz-choice-card-label" data-slot="choice-card-label" id={labelId}>
              {children}
            </span>
            {description != null && (
              <span
                className="nz-choice-card-description"
                data-slot="choice-card-description"
                id={descriptionId}
              >
                {description}
              </span>
            )}
          </span>
          {trailing != null && (
            <span
              className="nz-choice-card-trailing"
              data-slot="choice-card-trailing"
              id={trailingId}
            >
              {trailing}
            </span>
          )}
        </>
      ),
    },
  );
}

// NO directive, and no client module anywhere in this file's import graph (M31, D-aa): FieldStatic
// and the one anatomy every Field renders. Field (field.tsx) imports the FieldScope client leaf, so
// a bundler that collects every 'use client' module a route reaches ships that leaf's chunk with it
// (W7: +3,035 B under Turbopack prod for a function child). A page that imports only FieldStatic
// reaches this file, InlineError and the glyphs, all server-safe, so it ships no Field code at all.
// Field's function-child path renders through `staticField` below, so the two cannot drift.
// The contract is FIELD-CONTRACT.md in this folder; the graph tests are in test/ssr/field.test.tsx.
import {
  useId,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { joinIds, presented } from '../_internal/field';
import { CircleXGlyph } from '../_internal/glyphs';
import { InlineError } from '../inline-error/inline-error';

/** When native validation messages are presented. */
export type FieldValidateOn = 'submit' | 'blur';

/** The `ValidityState` flags a `messages` entry can replace. */
export type FieldValidityKey =
  | 'valueMissing'
  | 'typeMismatch'
  | 'patternMismatch'
  | 'tooLong'
  | 'tooShort'
  | 'rangeUnderflow'
  | 'rangeOverflow'
  | 'stepMismatch'
  | 'badInput'
  | 'customError';

/** Ids a Field generates; each one given here replaces the generated one (Conform, tests). */
export interface FieldIds {
  control?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  error?: string | undefined;
}

export interface FieldState {
  /** An error message is presented. */
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  readOnly: boolean;
}

/**
 * Attributes for the native element of a control: what a function child receives, and the base of
 * `useFieldControl().controlProps`. Serialisable; flags are `true` or `undefined`, never `false`.
 */
// A type alias, not an interface: it must be assignable to `mergeProps`' `Record<string, unknown>`.
export type FieldControlProps = {
  id?: string | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
};

export interface FieldProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The visible name, a `<label for>` the control. */
  label?: ReactNode;
  /** Help text under the control, joined to its `aria-describedby`. */
  description?: ReactNode;
  /**
   * The error message, rendered through InlineError with an icon (never colour alone). Its presence
   * is what "invalid" means (§8.3): `aria-invalid` on the control and `data-invalid` on the Field.
   * It is not a live region; around a client control, the Field's one announcer speaks a new error
   * while focus is already in the Field (§16.5's one exception, FIELD-CONTRACT.md). `null`, `false`
   * and `''` present no error.
   */
  error?: ReactNode;
  /** Replaces the internal error mark (`circle-x`). Decorative. */
  errorIcon?: ReactNode;
  /**
   * The control is a group of native controls under one root (SegmentedControl, a third-party
   * picker), not one labelable element: the label then has no `for`, and names the group through
   * the `aria-labelledby` the control puts on its root (FIELD-CONTRACT.md). @default false
   */
  group?: boolean;
  /** Passed to the control. */
  name?: string;
  /** The control is required: native `required`, and an `aria-hidden` mark after the label. @default false */
  required?: boolean;
  /** @default false */
  disabled?: boolean;
  /** @default false */
  readOnly?: boolean;
  ids?: FieldIds;
  /** Messages for native validation, by validity flag, instead of the browser's own text. */
  messages?: Partial<Record<FieldValidityKey, string>>;
  /** Native messages appear on submit, or also when the control loses focus. @default 'submit' */
  validateOn?: FieldValidateOn;
  /** Composition of the root `<div>`. */
  render?: RenderProp<FieldState>;
  /**
   * The control. A function receives ready-made control attributes and renders with no client code
   * at all (zero-JS mode, for Server-Component forms and plain elements); its second argument,
   * `field`, carries the ids for anything else, as on `FieldStatic`. A NativeSelect placed directly
   * inside is wired the same way, with no function. Client controls (Input, Checkbox, …) read the
   * wiring through `useFieldControl`.
   */
  children?: ReactNode | ((control: FieldControlProps, field: FieldStaticWiring) => ReactNode);
}

/**
 * What a FieldStatic function child receives as its second argument: the wiring FieldStatic does
 * not do for you, since it provides no context. Use it for a control that is not one labelable
 * element (`aria-labelledby` on a group root or a button) or to point other elements at the parts.
 */
export interface FieldStaticWiring extends FieldState {
  /** Every id the Field renders, generated or taken from `ids`. */
  ids: { control: string; label: string; description: string; error: string };
  /** The label's id while a label renders, for `aria-labelledby`; `undefined` without a label. */
  labelledBy: string | undefined;
  /** The description and error ids that render, in that order; the control's `aria-describedby`. */
  describedBy: string | undefined;
}

export interface FieldStaticProps extends Omit<FieldProps, 'children' | 'messages' | 'validateOn'> {
  /**
   * Not on FieldStatic: nothing intercepts native validation, so the browser shows its own bubble.
   * For inline native messages use `Field`.
   */
  messages?: never;
  /** Not on FieldStatic: see `messages`. */
  validateOn?: never;
  /**
   * The control, always a function: FieldStatic provides no context, so a Nizivo client control
   * placed directly inside (`<Input />`) would not be wired, and that is a type error here (use
   * `Field`). Spread `control` on the element that holds the value (`<input {...control} />`,
   * `<NativeSelect {...control}>`); `field` carries the ids for anything else.
   */
  children: (control: FieldControlProps, field: FieldStaticWiring) => ReactNode;
}

/**
 * The Field anatomy with no client code: label, control, description and error, the same HTML and
 * ids as `Field` with a function child (M31). Server-safe, and its module imports no client leaf,
 * so a page that renders only FieldStatic ships no Field JavaScript in any bundler. It provides no
 * context and no announcer, and native validation shows the browser's own bubble; the function
 * child wires the control (FIELD-CONTRACT.md "FieldStatic").
 */
export function FieldStatic({
  label,
  description,
  error,
  errorIcon,
  group = false,
  name,
  required = false,
  disabled = false,
  readOnly = false,
  ids,
  render,
  children,
  // never typed, but a plain-JS caller may still pass them: kept off the root <div>
  messages: _messages,
  validateOn: _validateOn,
  ...root
}: FieldStaticProps): ReactElement {
  const anatomy = {
    ids: resolveIds(useId(), ids, undefined),
    label,
    group,
    description,
    error,
    errorIcon,
    required,
    disabled,
    readOnly,
    render,
    root,
  };
  // Plain-JS callers: an element child would otherwise fail as "control is not a function".
  if (typeof children !== 'function')
    throw new TypeError('FieldStatic: children must be a function; put an element in a Field');
  return staticField(anatomy, name, children);
}

/** What the anatomy needs; FieldScope passes the same object with its own message and children. */
interface FieldAnatomy {
  ids: Required<{ [K in keyof FieldIds]: string }>;
  label: ReactNode;
  /** A group control: the label names it by `aria-labelledby` only, with no `for`. */
  group: boolean;
  description: ReactNode;
  error: ReactNode;
  errorIcon: ReactNode;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  /** `undefined` on the zero-JS path, where nothing intercepts native validation. */
  validateOn: FieldValidateOn | undefined;
  render: RenderProp<FieldState> | undefined;
  /** Attributes of the root. */
  root: Omit<ComponentPropsWithRef<'div'>, 'children'>;
  /** FieldScope only (never serialised): `labelBehavior: 'focus'` (FIELD-CONTRACT.md). */
  onLabelClick?: ((event: MouseEvent<HTMLLabelElement>) => void) | undefined;
  /** FieldScope only: the polite live region of §16.5's one exception, rendered last. */
  announcer?: ReactNode;
  children: ReactNode;
}

/** The ids of one Field: a directly placed control's own id, else `ids`, else generated. */
export function resolveIds(
  base: string,
  ids: FieldIds | undefined,
  ownId: string | undefined,
): FieldAnatomy['ids'] {
  return {
    control: ownId ?? ids?.control ?? `${base}-control`,
    label: ids?.label ?? `${base}-label`,
    description: ids?.description ?? `${base}-description`,
    error: ids?.error ?? `${base}-error`,
  };
}

/**
 * The zero-JS render, shared by FieldStatic and Field's function child: the control attributes and
 * the wiring go to `control`, and the anatomy renders around what it returns, with no
 * `data-validate-on` and no announcer.
 */
export function staticField(
  anatomy: Omit<FieldAnatomy, 'validateOn' | 'children'>,
  name: string | undefined,
  control: (control: FieldControlProps, field: FieldStaticWiring) => ReactNode,
): ReactElement {
  const { ids, label, description, required, disabled, readOnly } = anatomy;
  const invalid = presented(anatomy.error);
  const described = describedBy(ids, description, invalid);
  const attributes = fieldControlProps({
    id: ids.control,
    name,
    required,
    disabled,
    readOnly,
    invalid,
    describedBy: described,
  });
  const wiring: FieldStaticWiring = {
    ids,
    labelledBy: presented(label) ? ids.label : undefined,
    describedBy: described,
    invalid,
    required,
    disabled,
    readOnly,
  };
  const field = { ...anatomy, validateOn: undefined, children: control(attributes, wiring) };
  // The literal slot and class name the root for nz api; they equal what fieldRootProps() writes,
  // and overwriting in place keeps its attribute order, so every path prints the same HTML.
  return renderElement('div', anatomy.render, fieldState(field), {
    ...fieldRootProps(field),
    'data-slot': 'field',
    className: cx('nz-field', anatomy.root.className),
  });
}

/** The state a Field's `render` function receives. */
export function fieldState(anatomy: FieldAnatomy): FieldState {
  const { required, disabled, readOnly } = anatomy;
  return { invalid: presented(anatomy.error), disabled, required, readOnly };
}

/**
 * The root props of the one DOM shape of a Field: label, control, description, error (§10.6).
 * Every path renders it: FieldStatic and Field's function child (zero JS) and FieldScope (with its
 * native message and announcer).
 */
export function fieldRootProps(anatomy: FieldAnatomy): Record<string, unknown> {
  const { ids, label, description, error, required, disabled, readOnly, validateOn } = anatomy;
  const invalid = presented(error);
  return {
    'data-slot': 'field',
    ...stateAttrs({ invalid, disabled, required, readOnly }),
    'data-validate-on': validateOn,
    ...anatomy.root,
    className: cx('nz-field', anatomy.root.className),
    children: (
      <>
        {presented(label) && (
          // onClick is FieldScope's, for a button control (labelBehavior: 'focus'): not a new
          // interaction, the label's click already acts on the control; it narrows it to focus.
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
          <label
            className="nz-field-label"
            data-slot="field-label"
            id={ids.label}
            htmlFor={anatomy.group ? undefined : ids.control}
            onClick={anatomy.onLabelClick}
          >
            {label}
            {required && (
              <span className="nz-field-required" data-slot="field-required" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {anatomy.children}
        {presented(description) && (
          <div className="nz-field-description" data-slot="field-description" id={ids.description}>
            {description}
          </div>
        )}
        {invalid && (
          <InlineError
            className="nz-field-error"
            data-slot="field-error"
            id={ids.error}
            icon={anatomy.errorIcon ?? <CircleXGlyph />}
          >
            {error}
          </InlineError>
        )}
        {anatomy.announcer}
      </>
    ),
  };
}

/** `aria-describedby` of the control: description, then error (§16.1). */
export function describedBy(
  ids: { description: string; error: string },
  description: ReactNode,
  invalid: boolean,
): string | undefined {
  return joinIds(presented(description) && ids.description, invalid && ids.error);
}

/** Control attributes; `false` flags and unknown values are left out, never set to `undefined`. */
export function fieldControlProps(state: {
  id: string | undefined;
  name: string | undefined;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
  describedBy: string | undefined;
}): FieldControlProps {
  // Only the attributes it sets: a plain spread after a consumer's own `name` or `required`
  // (`<input name="title" {...control} />`) must not overwrite it with `undefined`.
  return {
    ...(state.id !== undefined && { id: state.id }),
    ...(state.name !== undefined && { name: state.name }),
    ...(state.required && { required: true }),
    ...(state.disabled && { disabled: true }),
    ...(state.readOnly && { readOnly: true }),
    ...(state.describedBy !== undefined && { 'aria-describedby': state.describedBy }),
    ...(state.invalid && { 'aria-invalid': true }),
  };
}

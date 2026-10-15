// NO directive: the server-safe Field shell (ARCHITECTURE.md §10.6, §16.1). It calls `useId` and
// nothing else, then hands serialisable props to the FieldScope client leaf, which provides the
// context a control reads. A function child is the zero-JS path: the shell renders it directly.
// The contract every control builds on is FIELD-CONTRACT.md in this folder.
import {
  cloneElement,
  isValidElement,
  useId,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { FIELD_CONTROL, joinIds, presented } from '../_internal/field';
import { CircleXGlyph } from '../_internal/glyphs';
import { InlineError } from '../inline-error/inline-error';
import { FieldScope } from './field-scope.client';

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
   * It is not a live region (§16.5). `null`, `false` and `''` present no error.
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
   * at all (zero-JS mode, for Server-Component forms and plain elements). A NativeSelect placed
   * directly inside is wired the same way, with no function. Client controls (Input, Checkbox, …)
   * read the wiring through `useFieldControl`.
   */
  children?: ReactNode | ((control: FieldControlProps) => ReactNode);
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
  children: ReactNode;
}

export function Field({
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
  messages,
  validateOn = 'submit',
  render,
  children,
  ...root
}: FieldProps): ReactElement {
  const base = useId();
  // A server-safe control placed directly inside: wired as a function child would be, and its own
  // id, if any, is the one the label points at.
  const wired = staticControl(children) ? children : undefined;
  const ownId = wired?.props['id'];
  const anatomy = {
    ids: {
      control: (typeof ownId === 'string' ? ownId : undefined) ?? ids?.control ?? `${base}-control`,
      label: ids?.label ?? `${base}-label`,
      description: ids?.description ?? `${base}-description`,
      error: ids?.error ?? `${base}-error`,
    },
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
  const zeroJs =
    typeof children === 'function'
      ? children
      : wired === undefined
        ? undefined
        : (control: FieldControlProps) => cloneElement(wired, fill(control, wired.props));
  if (zeroJs !== undefined) {
    const invalid = presented(error);
    const control = fieldControlProps({
      id: anatomy.ids.control,
      name,
      required,
      disabled,
      readOnly,
      invalid,
      describedBy: describedBy(anatomy.ids, description, invalid),
    });
    const field = { ...anatomy, validateOn: undefined, children: zeroJs(control) };
    // The literal slot and class name the root for nz api; they equal what fieldRootProps() writes,
    // and overwriting in place keeps its attribute order, so both paths print the same HTML.
    return renderElement('div', render, fieldState(field), {
      ...fieldRootProps(field),
      'data-slot': 'field',
      className: cx('nz-field', root.className),
    });
  }
  // Every prop here crosses the server/client boundary, so each is serialisable.
  return (
    <FieldScope anatomy={{ ...anatomy, validateOn }} name={name} messages={messages}>
      {typeof children === 'function' ? null : children}
    </FieldScope>
  );
}

/** A server-safe control (NativeSelect) that takes the zero-JS wiring as plain props. */
function staticControl(children: unknown): children is ReactElement<Record<string, unknown>> {
  return (
    isValidElement(children) &&
    typeof children.type === 'function' &&
    Object.hasOwn(children.type, FIELD_CONTROL)
  );
}

/**
 * The Field's attributes a directly placed control did not set itself: the control's own props win
 * (an explicit `false` included), and `aria-describedby` is joined after the Field's ids.
 */
function fill(control: FieldControlProps, own: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(control)) if (own[key] === undefined) out[key] = value;
  const ownDescribedBy = own['aria-describedby'];
  const described = joinIds(
    control['aria-describedby'],
    typeof ownDescribedBy === 'string' ? ownDescribedBy : undefined,
  );
  if (described !== undefined) out['aria-describedby'] = described;
  return out;
}

/** The state a Field's `render` function receives. */
export function fieldState(anatomy: FieldAnatomy): FieldState {
  const { required, disabled, readOnly } = anatomy;
  return { invalid: presented(anatomy.error), disabled, required, readOnly };
}

/**
 * The root props of the one DOM shape of a Field: label, control, description, error (§10.6).
 * Both paths render it: Field itself (zero JS) and FieldScope (with its native message).
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

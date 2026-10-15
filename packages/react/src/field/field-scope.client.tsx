'use client';
// FieldScope: the Field's client leaf (ARCHITECTURE.md §16.1). The server shell renders it with
// serialisable props; it provides the context `useFieldControl` reads, owns the native validation
// message, and renders the same anatomy as the zero-JS path. Contract: FIELD-CONTRACT.md.
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { renderElement } from '../contracts/render';
import { joinIds, presented } from '../_internal/field';
import {
  describedBy,
  fieldControlProps,
  fieldRootProps,
  fieldState,
  type FieldControlProps,
  type FieldValidityKey,
} from './field';

/** A native element that takes part in constraint validation. */
export type FieldValidatable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** What a control passes in: its own props, which win over the Field's (FIELD-CONTRACT.md). */
export interface FieldControlOptions {
  id?: string | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  invalid?: boolean | undefined;
  /** Joined after the Field's description and error ids, for example a text affix or a count. */
  'aria-describedby'?: string | undefined;
  /**
   * `'focus'`: a click on the Field label focuses the control and does nothing else. For button
   * controls (Select, third-party pickers): a `<label for>` a button presses it, which would open its
   * popup. Omitted, the label keeps the browser's behaviour.
   */
  labelBehavior?: 'focus' | undefined;
}

/** `controlProps`: the attributes plus the Field's validation handlers, inside a Field. */
export type FieldControlElementProps = FieldControlProps & {
  onInvalid?: ((event: SyntheticEvent<FieldValidatable>) => void) | undefined;
  onInput?: ((event: SyntheticEvent<FieldValidatable>) => void) | undefined;
  onBlur?: ((event: FocusEvent<FieldValidatable>) => void) | undefined;
};

export interface FieldControl {
  /** A Field is around the control. */
  inField: boolean;
  id: string | undefined;
  /** The Field label's id, for a control named by `aria-labelledby` (button or group controls). */
  labelledBy: string | undefined;
  describedBy: string | undefined;
  name: string | undefined;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  /** An error message is presented (`data-invalid` semantics, §8.3). */
  invalid: boolean;
  /** Spread on the native element, merged with the consumer's props through `mergeProps`. */
  controlProps: FieldControlElementProps;
}

type Anatomy = Parameters<typeof fieldRootProps>[0];

interface Scope {
  id: string;
  labelledBy: string | undefined;
  describedBy: string | undefined;
  name: string | undefined;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
  handlers: Pick<FieldControlElementProps, 'onInvalid' | 'onInput' | 'onBlur'>;
  /** A control inside calls it with `true` while it asks for `labelBehavior: 'focus'`. */
  setLabelFocus: (on: boolean) => void;
}

const FieldContext = createContext<Scope | null>(null);

/** Internal: rendered only by `Field`. Every prop is serialisable. */
export function FieldScope({
  anatomy,
  name,
  messages,
  children,
}: {
  anatomy: Omit<Anatomy, 'children'>;
  name: string | undefined;
  messages: Partial<Record<FieldValidityKey, string>> | undefined;
  children: ReactNode;
}): ReactElement {
  // A native message exists only after a client event, so SSR and hydration always agree.
  const [native, setNative] = useState<string | null>(null);
  // The control onInvalid asks to focus: a new object each time, so the same message still re-renders.
  const [toFocus, setToFocus] = useState<{ element: FieldValidatable } | null>(null);
  const { ids, label, description, required, disabled, readOnly, validateOn } = anatomy;
  // One error channel, in priority order: the `error` prop, then the native message (§16.1).
  const error = presented(anatomy.error) ? anatomy.error : native;
  const invalid = presented(error);

  const handlers = useMemo<Scope['handlers']>(() => {
    const current = (element: FieldValidatable): string | null =>
      element.validity.valid ? null : messageOf(element, messages);
    return {
      onInvalid(event) {
        // Cancelling stops the browser bubble and its focus move: show the message inline and
        // focus the form's first invalid control ourselves, as the browser would have.
        event.preventDefault();
        const element = event.currentTarget;
        setNative(messageOf(element, messages));
        // Focus after the commit, not now: the control must already carry aria-invalid and the
        // error's id in aria-describedby when focus lands, or a screen reader reads it without them.
        if (element.form !== null && firstInvalid(element.form) === element) {
          setToFocus({ element });
        }
      },
      onInput(event) {
        // Silent: the message is not a live region, so typing announces nothing (§16.5).
        const next = current(event.currentTarget);
        setNative((shown) => (shown === null ? null : next));
      },
      // Present only with validateOn="blur", never as an `undefined` key. Reads validity directly:
      // checkValidity() would fire `invalid` and pull focus back.
      ...(validateOn === 'blur' && {
        onBlur(event: FocusEvent<FieldValidatable>) {
          setNative(current(event.currentTarget));
        },
      }),
    };
  }, [messages, validateOn]);

  // Set by a button control's `labelBehavior: 'focus'` after hydration, so the server HTML is the same.
  const [labelFocus, setLabelFocus] = useState(false);

  useLayoutEffect(() => {
    const element = toFocus?.element;
    if (element?.form != null && firstInvalid(element.form) === element) element.focus();
  }, [toFocus]);

  const scope = useMemo<Scope>(
    () => ({
      id: ids.control,
      labelledBy: presented(label) ? ids.label : undefined,
      describedBy: describedBy(ids, description, invalid),
      name,
      required,
      disabled,
      readOnly,
      invalid,
      handlers,
      setLabelFocus,
    }),
    [ids, label, description, invalid, name, required, disabled, readOnly, handlers],
  );

  const field = {
    ...anatomy,
    error,
    onLabelClick: labelFocus ? focusControl : undefined,
    children,
  };
  return (
    <FieldContext value={scope}>
      {renderElement('div', anatomy.render, fieldState(field), fieldRootProps(field))}
    </FieldContext>
  );
}

/**
 * Field wiring for a control (FIELD-CONTRACT.md). The control's own props win; `aria-describedby`
 * is joined. With no Field around the control, everything comes from `options`.
 */
export function useFieldControl(options: FieldControlOptions = {}): FieldControl {
  const scope = use(FieldContext);
  const id = options.id ?? scope?.id;
  const name = options.name ?? scope?.name;
  const required = options.required ?? scope?.required ?? false;
  const disabled = options.disabled ?? scope?.disabled ?? false;
  const readOnly = options.readOnly ?? scope?.readOnly ?? false;
  const invalid = options.invalid ?? scope?.invalid ?? false;
  const described = joinIds(scope?.describedBy, options['aria-describedby']);
  const setLabelFocus = options.labelBehavior === 'focus' ? scope?.setLabelFocus : undefined;
  useEffect(() => {
    if (setLabelFocus === undefined) return undefined;
    setLabelFocus(true);
    return () => setLabelFocus(false);
  }, [setLabelFocus]);
  return {
    inField: scope !== null,
    id,
    labelledBy: scope?.labelledBy,
    describedBy: described,
    name,
    required,
    disabled,
    readOnly,
    invalid,
    controlProps: {
      ...fieldControlProps({
        id,
        name,
        required,
        disabled,
        readOnly,
        invalid,
        describedBy: described,
      }),
      ...scope?.handlers,
    },
  };
}

/**
 * `labelBehavior: 'focus'`: a `<label for>` a button presses it, which would open its popup. Cancel
 * that and focus the control, with the ring showing where focus went, as React Aria's own Select
 * label does. A disabled control takes no focus.
 */
function focusControl(event: MouseEvent<HTMLLabelElement>): void {
  event.preventDefault();
  event.currentTarget.control?.focus({ focusVisible: true });
}

const VALIDITY_KEYS: readonly FieldValidityKey[] = [
  'valueMissing',
  'typeMismatch',
  'patternMismatch',
  'tooLong',
  'tooShort',
  'rangeUnderflow',
  'rangeOverflow',
  'stepMismatch',
  'badInput',
  'customError',
];

/** The Field's message for the first failing validity flag, else the browser's own text. */
function messageOf(
  element: FieldValidatable,
  messages: Partial<Record<FieldValidityKey, string>> | undefined,
): string {
  const key = VALIDITY_KEYS.find((flag) => element.validity[flag]);
  return (key === undefined ? undefined : messages?.[key]) ?? element.validationMessage;
}

/**
 * The form's first control that fails validation, in tree order. Not `querySelector(':invalid')`:
 * `fieldset:invalid` matches the ancestor first.
 */
function firstInvalid(form: HTMLFormElement): Element | undefined {
  for (const element of form.elements) {
    if (isValidatable(element) && element.willValidate && !element.validity.valid) return element;
  }
  return undefined;
}

function isValidatable(element: Element): element is FieldValidatable {
  return 'validity' in element && 'willValidate' in element;
}

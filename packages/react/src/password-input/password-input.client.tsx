'use client';
// PasswordInput: a native `<input type="password">` in Input's box with a show/hide toggle
// (ARCHITECTURE.md §16.1 D20, gap report A §4). The toggle is a `<button type="button">` with
// `aria-pressed` and a constant name ("Show password"): its state is the pressed state, never a
// label that flips. The password is hidden again on its form's `submit`, so the plain value is not
// left on screen and a password manager sees a password field. Field wiring as Input
// (useFieldControl). Input's own `trailingIcon` (aria-hidden) and `suffix` (a description) could not
// hold a button, so the box is written out here; input.css draws it.
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
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
import { EyeGlyph, EyeOffGlyph } from '../_internal/glyphs';
import { useFieldControl } from '../field/field-scope.client';

/** PasswordInput's own strings (§16.4): serialisable, English defaults. */
export interface PasswordInputLabels {
  /**
   * The toggle's name, the same in both states: `aria-pressed` says whether the password shows.
   * @default 'Show password'
   */
  toggle: string;
}

/** `'toggle'`: the toggle was pressed. `'submit'`: the form submitted, which hides the password. */
export type PasswordInputVisibleReason = 'toggle' | 'submit';

export interface PasswordInputState {
  size: ControlSize;
  /** The password shows as text. */
  visible: boolean;
  /** An error message is presented (the Field's, or the `invalid` prop). */
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
}

export interface PasswordInputProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'prefix' | 'children'
> {
  /** 32 / 40 / 48 px, as Input. @default 'md' */
  size?: ControlSize;
  /** An error message is presented for this input. Inside a Field, the Field sets it. */
  invalid?: boolean;
  /** The password shows as text when the input first renders. @default false */
  defaultVisible?: boolean;
  /** Called when the password is shown or hidden: by the toggle, or hidden by a submit. */
  onVisibleChange?: (visible: boolean, details: ChangeDetails<PasswordInputVisibleReason>) => void;
  /** The toggle's mark while the password is hidden. Defaults to the internal `eye` glyph. */
  showIcon?: ReactNode;
  /** The toggle's mark while the password shows. Defaults to the internal `eye-off` glyph. */
  hideIcon?: ReactNode;
  /** Overrides the toggle's name, for example `labels={{ toggle: 'Passwort anzeigen' }}`. */
  labels?: Partial<PasswordInputLabels>;
  /**
   * `'current-password'` to sign in, `'new-password'` to choose one (a password manager then offers
   * to generate one). @default 'current-password'
   */
  autoComplete?: ComponentPropsWithRef<'input'>['autoComplete'];
  /**
   * Composition of the root, the bordered box. `className` and `style` go on the root too; every
   * other prop, `ref` included, goes on the `<input>`.
   */
  render?: RenderProp<PasswordInputState>;
}

export function PasswordInput({
  size = 'md',
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  defaultVisible = false,
  onVisibleChange,
  showIcon,
  hideIcon,
  labels: labelsProp,
  autoComplete = 'current-password',
  render,
  className,
  style,
  ...rest
}: PasswordInputProps): JSX.Element {
  const labels = useLabels('passwordInput', labelsProp);
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid: invalid ?? (ariaInvalid === true || ariaInvalid === 'true' ? true : undefined),
    'aria-describedby': describedBy,
  });
  // The toggle's aria-controls needs the input's id, a Field's or our own.
  const own = useId();
  const inputId = field.id ?? own;
  const [visible, setVisible] = useState(defaultVisible);
  const input = useRef<HTMLInputElement | null>(null);
  const report = useRef(onVisibleChange);
  useEffect(() => {
    report.current = onVisibleChange;
  });

  // Hidden again when its form submits, in the capture phase: before React's own submit handler
  // runs the action and before the browser offers to save the password.
  useEffect(() => {
    const element = input.current;
    if (!visible || element === null) return undefined;
    const doc = element.ownerDocument;
    const onSubmit = (event: Event): void => {
      if (element.form === null || event.target !== element.form) return;
      element.type = 'password';
      setVisible(false);
      report.current?.(false, details('submit', event));
    };
    doc.addEventListener('submit', onSubmit, true);
    return () => doc.removeEventListener('submit', onSubmit, true);
  }, [visible]);

  const state: PasswordInputState = {
    size,
    visible,
    invalid: field.invalid,
    disabled: field.disabled,
    readOnly: field.readOnly,
  };
  const ownProps = {
    ...field.controlProps,
    id: inputId,
    ref: input,
    autoComplete,
    spellCheck: false,
    autoCapitalize: 'off',
  };
  return renderElement('span', render, state, {
    'data-slot': 'password-input',
    'data-size': size,
    ...stateAttrs({ invalid: state.invalid, disabled: state.disabled, readOnly: state.readOnly }),
    className: cx('nz-password-input nz-input', className),
    style,
    // A press on the padding focuses the input, as Input's box does; the toggle takes its own press.
    onMouseDown: focusInput,
    children: (
      <>
        <input
          // mergeProps only composes the refs into one callback ref; nothing reads them in render.
          // eslint-disable-next-line react-hooks/refs -- one comment for oxlint and the react-hooks lane
          {...mergeProps(ownProps, rest)}
          type={visible ? 'text' : 'password'}
          className="nz-password-input-control nz-input-control"
          data-slot="password-input-control"
        />
        <button
          type="button"
          className="nz-password-input-toggle"
          data-slot="password-input-toggle"
          aria-label={labels?.toggle ?? 'Show password'}
          aria-pressed={visible}
          aria-controls={inputId}
          disabled={field.disabled || undefined}
          onClick={(event) => {
            setVisible(!visible);
            onVisibleChange?.(!visible, details('toggle', event.nativeEvent));
          }}
        >
          <span
            className="nz-password-input-icon"
            data-slot="password-input-icon"
            aria-hidden="true"
          >
            {visible ? (hideIcon ?? <EyeOffGlyph />) : (showIcon ?? <EyeGlyph />)}
          </span>
        </button>
      </>
    ),
  });
}

function focusInput(event: MouseEvent<HTMLElement>): void {
  const input = event.currentTarget.querySelector<HTMLInputElement>(
    ':scope > .nz-password-input-control',
  );
  const target = event.target;
  if (input === null || target === input || input.disabled) return;
  if (target instanceof Element && target.closest('.nz-password-input-toggle') !== null) return;
  // Keep the caret where it is and avoid a blur/focus flicker, as a click on a native input does.
  event.preventDefault();
  input.focus();
}

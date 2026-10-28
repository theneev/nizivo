'use client';
// SearchField: a native <search> landmark that is the bordered box, around an <input type="search">
// (ARCHITECTURE.md §9.5, §16.1 D20; Figma Search Field 7275:14764, live 755:888, figma/06 §6.3). It is
// a client leaf for the same reason Input is (it reads the Field's FieldScope), plus the clear button.
// Filtering needs no JavaScript: put it in a <form method="get"> and Enter submits the query as a URL
// parameter; the server page reads it back and passes it as `defaultValue`. Its server HTML is
// complete and works before hydration. It is a real input, also in a top bar (M49), not a button that
// opens a command menu.
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { ControlSize } from '../augment';
import { useLabels } from '../config/config.client';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { CloseGlyph, SearchGlyph, SpinnerGlyph } from '../_internal/glyphs';
import { ariaKeyShortcuts } from '../_internal/keys';
import { useFieldControl } from '../field/field-scope.client';
import { Kbd } from '../kbd/kbd';

/** SearchField's own strings (§16.4): serialisable, English defaults. */
export interface SearchFieldLabels {
  /**
   * The input's name when nothing else names it: no Field, `aria-label` or `aria-labelledby`. The
   * placeholder is not a label. @default 'Search'
   */
  label: string;
  /** The clear button's name. @default 'Clear search' */
  clear: string;
}

export interface SearchFieldState {
  size: ControlSize;
  /** An error message is presented (the Field's, or the `invalid` prop). */
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
  pending: boolean;
  /** The input has a value, so the clear button shows. */
  filled: boolean;
}

export interface SearchFieldProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'prefix' | 'children'
> {
  /** 32 / 40 / 48 px, as Input, Button and Select. @default 'md' */
  size?: ControlSize;
  /**
   * An error message is presented for this field (§8.3). Inside a Field, the Field sets it; an
   * explicit value here wins.
   */
  invalid?: boolean;
  /**
   * A keyboard shortcut such as `"mod+k"`, drawn at the end of the field with `Kbd` (⌘K on Apple
   * platforms, Ctrl+K elsewhere) and announced through `aria-keyshortcuts`. The app binds the key
   * itself (focus the field through its `ref`), as with IconButton's `shortcut`; hidden while the
   * field has a value.
   */
  shortcut?: string;
  /** Replaces the magnifier before the value (decorative, 16 px). */
  icon?: ReactNode;
  /**
   * Results are on their way: the magnifier becomes a spinner and the root carries `data-pending`.
   * Announce the outcome (the number of results) where the results are. @default false
   */
  pending?: boolean;
  labels?: Partial<SearchFieldLabels>;
  /**
   * Composition of the root, the `<search>` box around the native `<input>`. `className` and
   * `style` go on the root too; every other prop, `ref` included, goes on the `<input>`.
   */
  render?: RenderProp<SearchFieldState>;
}

function hasText(value: ComponentPropsWithRef<'input'>['value']): boolean {
  return value != null && String(value) !== '';
}

/** The native value setter, so React sees the change, then the `input` event a user's edit fires. */
function clearInput(input: HTMLInputElement): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function SearchField({
  size = 'md',
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  shortcut,
  icon,
  pending = false,
  labels: labelsProp,
  render,
  className,
  style,
  ...rest
}: SearchFieldProps): JSX.Element {
  const labels = useLabels('searchField', labelsProp);
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid: invalid ?? (ariaInvalid === true || ariaInvalid === 'true' ? true : undefined),
    'aria-describedby': describedBy,
  });
  const input = useRef<HTMLInputElement>(null);
  // Uncontrolled: tracked from the input's own events. Controlled: the value says.
  const [typed, setTyped] = useState(() => hasText(rest.defaultValue));
  const filled = rest.value === undefined ? typed : hasText(rest.value);

  // form.reset() restores the default value without an input event; read it after the reset ran.
  useEffect(() => {
    const form = input.current?.form;
    if (form == null) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onReset = (): void => {
      timer = setTimeout(() => setTyped((input.current?.value ?? '') !== ''), 0);
    };
    form.addEventListener('reset', onReset);
    return () => {
      form.removeEventListener('reset', onReset);
      clearTimeout(timer);
    };
  }, []);

  const unnamed =
    !field.inField && rest['aria-label'] === undefined && rest['aria-labelledby'] === undefined;
  const editable = !field.disabled && !field.readOnly;
  const own = {
    ...field.controlProps,
    ref: input,
    'aria-label': unnamed ? (labels?.label ?? 'Search') : undefined,
    'aria-keyshortcuts': shortcut === undefined ? undefined : ariaKeyShortcuts(shortcut),
    onChange(event: ChangeEvent<HTMLInputElement>) {
      setTyped(event.currentTarget.value !== '');
    },
    // Escape clears a filled field in every engine (Firefox has no native clear), and goes no
    // further, so an enclosing Dialog stays open; on an empty field it does nothing.
    onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      const target = event.currentTarget;
      if (event.key !== 'Escape' || target.value === '' || target.readOnly) return;
      event.preventDefault();
      event.stopPropagation();
      clearInput(target);
    },
  };

  const state: SearchFieldState = {
    size,
    invalid: field.invalid,
    disabled: field.disabled,
    readOnly: field.readOnly,
    pending,
    filled,
  };
  return renderElement('search', render, state, {
    'data-slot': 'search-field',
    'data-size': size,
    ...stateAttrs({
      invalid: state.invalid,
      disabled: state.disabled,
      readOnly: state.readOnly,
      pending,
    }),
    className: cx('nz-search-field', className),
    style,
    // The whole box is the input's hit area: a press on the icon, the hint or the padding focuses it.
    onMouseDown: focusInput,
    children: (
      <>
        <span className="nz-search-field-icon" data-slot="search-field-icon" aria-hidden="true">
          {pending ? <SpinnerGlyph /> : (icon ?? <SearchGlyph />)}
        </span>
        {/* consumer handlers run first; a prevented event skips ours and the Field's */}
        <input
          // mergeProps only composes the refs into one callback ref; nothing reads them in render.
          // eslint-disable-next-line react-hooks/refs -- one comment for oxlint and the react-hooks lane
          {...mergeProps(own, rest)}
          type="search"
          className="nz-search-field-control"
          data-slot="search-field-control"
        />
        {/* Out of the Tab order: Escape clears from the keyboard, so Tab goes on to the next control. */}
        <button
          type="button"
          className="nz-search-field-clear"
          data-slot="search-field-clear"
          aria-label={labels?.clear ?? 'Clear search'}
          tabIndex={-1}
          hidden={!filled || !editable}
          onClick={clearAndFocus}
        >
          <CloseGlyph />
        </button>
        {shortcut !== undefined && (
          // the input carries aria-keyshortcuts, so the drawn keys are decorative
          <span
            className="nz-search-field-shortcut"
            data-slot="search-field-shortcut"
            aria-hidden="true"
            hidden={filled}
          >
            <Kbd keys={shortcut} />
          </span>
        )}
      </>
    ),
  });
}

function control(root: Element | null): HTMLInputElement | null {
  return root?.querySelector<HTMLInputElement>(':scope > .nz-search-field-control') ?? null;
}

function focusInput(event: MouseEvent<HTMLElement>): void {
  const input = control(event.currentTarget);
  if (input === null || event.target === input || input.disabled) return;
  // Keep the caret where it is and avoid a blur/focus flicker, as a click on a native input does;
  // this also keeps focus in the input when the clear button is pressed.
  event.preventDefault();
  input.focus();
}

function clearAndFocus(event: MouseEvent<HTMLButtonElement>): void {
  const input = control(event.currentTarget.parentElement);
  if (input === null) return;
  clearInput(input);
  input.focus();
}

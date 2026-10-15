// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5: NativeSelect is T0, server). A
// native <select> skinned like the Select trigger, for Server-Component forms that work with no
// JavaScript at all. It reads no Field context: a Field wires it as plain attributes (id, name,
// flags, ARIA), either placed directly inside (`<Field label="…"><NativeSelect>…</NativeSelect>`,
// recognised by its FIELD_CONTROL mark) or through the zero-JS function child
// `{(control) => <NativeSelect {...control}>…</NativeSelect>}` (src/field/FIELD-CONTRACT.md).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { ControlSize } from '../augment';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { FIELD_CONTROL } from '../_internal/field';
import { ChevronsUpDownGlyph } from '../_internal/glyphs';

export interface NativeSelectState {
  size: ControlSize;
  /** An error message is presented: the `invalid` prop, or `aria-invalid` from a Field. */
  invalid: boolean;
  disabled: boolean;
}

export interface NativeSelectProps extends Omit<
  ComponentPropsWithRef<'select'>,
  'size' | 'multiple' | 'readOnly'
> {
  /** 32 / 40 / 48 px, the Select trigger's heights. @default 'md' */
  size?: ControlSize;
  /**
   * An error message is presented for this select (§8.3). A Field's function child passes
   * `aria-invalid`, which counts too.
   */
  invalid?: boolean;
  /**
   * Text of a first, empty option shown until a value is chosen (`value=""`). With `required`,
   * submitting it fails `valueMissing`. When neither `value` nor `defaultValue` is given, it is
   * selected initially.
   */
  placeholder?: string;
  /** Decorative icon before the value (`aria-hidden`), as on the Select trigger. */
  leadingIcon?: ReactNode;
  /** Replaces the chevron glyph. Decorative. */
  indicator?: ReactNode;
  /**
   * `readOnly` is accepted and dropped, so a Field function child can be spread as it is: a
   * `<select>` has no read-only state.
   */
  readOnly?: boolean | undefined;
  /**
   * Composition of the wrapper. `className` and `style` go on the wrapper too; every other prop,
   * `ref` included, goes on the native `<select>`.
   */
  render?: RenderProp<NativeSelectState>;
  /** `<option>` and `<optgroup>` elements. */
  children?: ReactNode;
}

export function NativeSelect({
  size = 'md',
  invalid,
  placeholder,
  leadingIcon,
  indicator,
  readOnly: _readOnly,
  render,
  className,
  style,
  value,
  defaultValue,
  disabled = false,
  'aria-invalid': ariaInvalid,
  children,
  ...rest
}: NativeSelectProps): ReactElement {
  // One rule with the Field contract: an explicit `invalid` wins, else what the Field passed.
  const state: NativeSelectState = {
    size,
    invalid: invalid ?? (ariaInvalid === true || ariaInvalid === 'true'),
    disabled,
  };
  // With no value given, the placeholder option is the initial one; otherwise the browser would
  // select the first option it may (the placeholder is disabled, so not it).
  const initial =
    placeholder !== undefined && value === undefined && defaultValue === undefined
      ? ''
      : defaultValue;
  return renderElement('span', render, state, {
    'data-slot': 'native-select',
    'data-size': size,
    ...stateAttrs({ invalid: state.invalid, disabled }),
    className: cx('nz-native-select', className),
    style,
    children: (
      <>
        {leadingIcon != null && (
          <span className="nz-native-select-icon" data-slot="native-select-icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <select
          {...rest}
          {...(value !== undefined && { value })}
          {...(initial !== undefined && { defaultValue: initial })}
          {...(disabled && { disabled: true })}
          aria-invalid={state.invalid || undefined}
          className="nz-native-select-trigger"
          data-slot="native-select-trigger"
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {/* "the chevron says choose", as on the Select trigger */}
        <span
          className="nz-native-select-chevron"
          data-slot="native-select-chevron"
          aria-hidden="true"
        >
          {indicator ?? <ChevronsUpDownGlyph />}
        </span>
      </>
    ),
  });
}

// Field recognises it as a direct child and wires it with no client code (field.tsx).
Object.defineProperty(NativeSelect, FIELD_CONTROL, { value: true });

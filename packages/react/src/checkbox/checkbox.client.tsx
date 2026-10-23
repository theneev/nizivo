'use client';
// Checkbox: a native <input type="checkbox"> in a thin client leaf (ARCHITECTURE.md §9.5, §16.1).
// The input is the visible box (appearance: none), so `:checked` repaints with no JavaScript and the
// form submits before hydration. The leaf exists for Field wiring and for `indeterminate`, a DOM
// property with no attribute. Contract with Field: field/FIELD-CONTRACT.md.
import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { details, type ChangeDetails } from '../contracts/details';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { useFieldControl } from '../field/field-scope.client';
import { CheckGlyph, MinusGlyph } from '../_internal/glyphs';
import { cx } from '../_internal/cx';
import { presented } from '../_internal/field';

/** `'indeterminate'` is the mixed state of a "select all" box; it submits as unchecked. */
export type CheckboxCheckedState = boolean | 'indeterminate';

/** Every change comes from the native `change` event: a click, Space, or a click on the label. */
export type CheckboxChangeReason = 'input';

/** What a `render` function receives for the root `<label>`. */
export interface CheckboxState {
  /** An error message is presented (the Field's, or the `invalid` prop). */
  invalid: boolean;
  disabled: boolean;
  required: boolean;
}

export interface CheckboxProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'checked' | 'defaultChecked' | 'children' | 'readOnly' | 'size'
> {
  /** Controlled state. `'indeterminate'` shows the dash; a click then reports `true`. */
  checked?: CheckboxCheckedState;
  /** Uncontrolled initial state. @default false */
  defaultChecked?: CheckboxCheckedState;
  /** Called after the consumer's own `onChange`, unless it called `preventDefault()`. */
  onCheckedChange?: (checked: boolean, details: ChangeDetails<CheckboxChangeReason>) => void;
  /** An error message is presented for this box. Inside a Field, the Field decides. */
  invalid?: boolean;
  /** Replaces the internal check and dash glyphs (decorative), shown while checked or mixed. */
  indicator?: ReactNode;
  /** Composition of the root `<label>`, the hit target. */
  render?: RenderProp<CheckboxState>;
  /** The label, after the box. Without one, name the box with `aria-label`. */
  children?: ReactNode;
}

/**
 * `className` and `style` go on the root `<label>`; every other attribute, `ref` included, goes on the
 * native `<input>`, so form libraries (`register`, `setFocus`) reach the real control.
 */
export function Checkbox({
  id,
  name,
  required,
  disabled,
  invalid,
  'aria-describedby': describedBy,
  checked,
  defaultChecked,
  onCheckedChange,
  indicator,
  render,
  className,
  style,
  children,
  ...rest
}: CheckboxProps): ReactElement {
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    invalid,
    'aria-describedby': describedBy,
  });
  // `readOnly` does nothing on a checkbox (FIELD-CONTRACT.md rule 5): never spread it.
  const { readOnly: _readOnly, ...control } = field.controlProps;

  const input = useRef<HTMLInputElement>(null);
  const initiallyMixed = useRef(defaultChecked === 'indeterminate');
  // Controlled: `true` or `false`; uncontrolled: `undefined`.
  const mixed = checked === undefined ? undefined : checked === 'indeterminate';
  useLayoutEffect(() => {
    const element = input.current;
    if (element === null) return;
    if (mixed !== undefined) {
      element.indeterminate = mixed;
    } else if (initiallyMixed.current) {
      // Once: the browser clears it on the first click, as for any native checkbox.
      element.indeterminate = true;
      initiallyMixed.current = false;
    }
  }, [mixed]);

  const own = {
    ...control,
    ref: input,
    checked: checked === undefined ? undefined : checked === true,
    defaultChecked: defaultChecked === undefined ? undefined : defaultChecked === true,
    onChange(event: ChangeEvent<HTMLInputElement>) {
      // A controlled mixed box stays mixed until its owner changes `checked`.
      if (mixed === true) event.currentTarget.indeterminate = true;
      onCheckedChange?.(event.currentTarget.checked, details('input', event.nativeEvent));
    },
  };

  const state: CheckboxState = {
    invalid: field.invalid,
    disabled: field.disabled,
    required: field.required,
  };
  return renderElement('label', render, state, {
    'data-slot': 'checkbox',
    ...stateAttrs(state),
    className: cx('nz-checkbox nz-hit-target', className),
    style,
    children: (
      <>
        {/* consumer handlers run first; a prevented event skips ours and the Field's */}
        <input
          // mergeProps only composes the refs into one callback ref; nothing reads them in render.
          // eslint-disable-next-line react-hooks/refs -- one comment for oxlint and the react-hooks lane
          {...mergeProps(own, rest)}
          type="checkbox"
          className="nz-checkbox-input"
          data-slot="checkbox-input"
        />
        <span className="nz-checkbox-indicator" data-slot="checkbox-indicator" aria-hidden="true">
          {indicator ?? (
            <>
              <CheckGlyph />
              <MinusGlyph />
            </>
          )}
        </span>
        {presented(children) && (
          <span className="nz-checkbox-label" data-slot="checkbox-label">
            {children}
          </span>
        )}
      </>
    ),
  });
}

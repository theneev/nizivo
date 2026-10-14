'use client';
// Textarea: a native <textarea> in a thin client leaf (ARCHITECTURE.md §9.5, §16.1 D20). Client only
// to read the Field's FieldScope context through useFieldControl, as Input; no state, complete
// server HTML. Its height is the native `rows`, and the user can resize it vertically; where the
// browser has `field-sizing` it also grows with its content, never below `rows` (textarea.css).
import type { ComponentPropsWithRef, JSX } from 'react';
import { mergeProps } from '../contracts/merge-props';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { useFieldControl } from '../field/field-scope.client';

export interface TextareaProps extends Omit<ComponentPropsWithRef<'textarea'>, 'children'> {
  /**
   * Visible lines of text, and the minimum height where it grows with its content (1 to 10; a
   * larger value keeps a 3-line minimum there). @default 3
   */
  rows?: number;
  /**
   * An error message is presented for this textarea (§8.3). Inside a Field, the Field sets it; an
   * explicit value here wins.
   */
  invalid?: boolean;
}

export function Textarea({
  rows = 3,
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-describedby': describedBy,
  className,
  ...rest
}: TextareaProps): JSX.Element {
  // No defaults on these: `undefined` inherits from the Field, `false` overrides it.
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid,
    'aria-describedby': describedBy,
  });
  return (
    // consumer handlers run first; a prevented event skips the Field's
    <textarea
      {...mergeProps(field.controlProps, rest)}
      {...stateAttrs({
        invalid: field.invalid,
        disabled: field.disabled,
        readOnly: field.readOnly,
      })}
      rows={rows}
      className={cx('nz-textarea', className)}
      data-slot="textarea"
    />
  );
}

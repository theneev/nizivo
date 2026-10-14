// NO directive: server-safe helpers shared by Field, Fieldset and the controls' Field wiring.
import type { ReactNode } from 'react';

/**
 * Whether a message node renders something. `null`, `undefined`, booleans and `''` render nothing,
 * so `error={failed && 'Enter a price'}` presents no error when `failed` is false.
 */
export function presented(node: ReactNode): boolean {
  return node != null && typeof node !== 'boolean' && node !== '';
}

/** Joins id references for `aria-describedby`, skipping empty ones; `undefined` when none remain. */
export function joinIds(
  ...ids: ReadonlyArray<string | false | null | undefined>
): string | undefined {
  const joined = ids.filter((id): id is string => typeof id === 'string' && id !== '').join(' ');
  return joined === '' ? undefined : joined;
}

/**
 * Marks a server-safe control (NativeSelect) that Field wires as plain props when it is placed
 * directly inside, as if it were a function child: zero JS, and the label still points at it.
 */
export const FIELD_CONTROL: unique symbol = Symbol.for('nizivo.field-control');

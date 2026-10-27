'use client';
// PUBLIC NumberField parts (ARCHITECTURE.md §16.1; no Figma component: Input's box, with the Number
// Stepper's step buttons 7367:377). A number in the locale's format, a currency, a percent or a
// unit, which a native `type="number"` cannot show or parse (gap report A §4). They own the CSS contract; the engine owns behaviour. Field wiring as
// Input: the Field's label points at the input, and its id, description and error reach it.
import { createContext, use, useId, useMemo, type JSX } from 'react';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { joinIds } from '../_internal/field';
import { MinusGlyph, PlusGlyph } from '../_internal/glyphs';
import { useFieldControl, type FieldControlElementProps } from '../field/field-scope.client';
import * as Engine from './engine';
import type {
  NumberFieldButtonProps,
  NumberFieldInputProps,
  NumberFieldRootProps,
  NumberFieldRootState,
} from './number-field.contract';

interface ScopeValue {
  /** The Field's validation handlers, for the input. */
  handlers?: Pick<FieldControlElementProps, 'onInvalid' | 'onInput' | 'onBlur'> | undefined;
  /** The Field's description and error ids, and the root's own, for the input. */
  describedBy?: string | undefined;
  /**
   * The label id a step button's name ends with ("Increase" + "Price"), as React Aria does for its
   * own label. Unset when the root has an `aria-label` (React Aria then writes "Increase Qty") or
   * for a button whose name `labels` sets.
   */
  labelledBy?: { decrement?: string | undefined; increment?: string | undefined } | undefined;
}

const Scope = createContext<ScopeValue>({});

const renderRoot = toRenderFn<NumberFieldRootState>(undefined, 'div');

export function NumberFieldRoot({
  size = 'md',
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  labels,
  className,
  ...props
}: NumberFieldRootProps): JSX.Element {
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid,
    'aria-describedby': describedBy,
  });
  // the Field label names the input (its `for`) and, through aria-labelledby, the step buttons
  const named = labelledBy ?? field.labelledBy;
  const { onInvalid, onInput, onBlur } = field.controlProps;
  const labelId = props['aria-label'] === undefined ? named : undefined;
  const scope = useMemo(
    () => ({
      handlers: field.inField ? { onInvalid, onInput, onBlur } : undefined,
      describedBy: field.describedBy,
      labelledBy: {
        decrement: labels?.decrement === undefined ? labelId : undefined,
        increment: labels?.increment === undefined ? labelId : undefined,
      },
    }),
    [
      field.inField,
      onInvalid,
      onInput,
      onBlur,
      field.describedBy,
      labelId,
      labels?.decrement,
      labels?.increment,
    ],
  );
  return (
    <Scope value={scope}>
      <Engine.Root
        {...props}
        {...(field.id !== undefined && { id: field.id })}
        {...(field.name !== undefined && { name: field.name })}
        {...(named !== undefined && { 'aria-labelledby': named })}
        required={field.required}
        disabled={field.disabled}
        readOnly={field.readOnly}
        invalid={field.invalid}
        incrementLabel={labels?.increment}
        decrementLabel={labels?.decrement}
        className={cx('nz-number-field nz-input', className)}
        data-slot="number-field"
        data-size={size}
        render={renderRoot}
      />
    </Scope>
  );
}

export function NumberFieldInput({
  'aria-describedby': own,
  className,
  render,
  ...rest
}: NumberFieldInputProps): JSX.Element {
  const { handlers, describedBy } = use(Scope);
  return (
    <Engine.Input
      {...handlers}
      {...rest}
      aria-describedby={joinIds(describedBy, own)}
      className={cx('nz-number-field-input nz-input-control', className)}
      data-slot="number-field-input"
      render={toRenderFn(render, 'input')}
    />
  );
}

/** A step button's id and, with a label to end on, its `aria-labelledby` (itself, then the label). */
function useStepName(
  direction: 'decrement' | 'increment',
  id: string | undefined,
  labelledBy: string | undefined,
): { id?: string; 'aria-labelledby'?: string } {
  const own = useId();
  const label = use(Scope).labelledBy?.[direction];
  if (labelledBy !== undefined)
    return { ...(id !== undefined && { id }), 'aria-labelledby': labelledBy };
  if (label === undefined) return id === undefined ? {} : { id };
  const self = id ?? own;
  return { id: self, 'aria-labelledby': `${self} ${label}` };
}

export function NumberFieldDecrement({
  id,
  'aria-labelledby': labelledBy,
  className,
  render,
  children,
  ...rest
}: NumberFieldButtonProps): JSX.Element {
  const name = useStepName('decrement', id, labelledBy);
  return (
    <Engine.Decrement
      {...rest}
      {...name}
      className={cx('nz-number-field-button nz-number-field-decrement', className)}
      data-slot="number-field-decrement"
      render={toRenderFn(render, 'button')}
    >
      <span className="nz-number-field-icon" aria-hidden="true">
        {children ?? <MinusGlyph />}
      </span>
    </Engine.Decrement>
  );
}

export function NumberFieldIncrement({
  id,
  'aria-labelledby': labelledBy,
  className,
  render,
  children,
  ...rest
}: NumberFieldButtonProps): JSX.Element {
  const name = useStepName('increment', id, labelledBy);
  return (
    <Engine.Increment
      {...rest}
      {...name}
      className={cx('nz-number-field-button nz-number-field-increment', className)}
      data-slot="number-field-increment"
      render={toRenderFn(render, 'button')}
    >
      <span className="nz-number-field-icon" aria-hidden="true">
        {children ?? <PlusGlyph />}
      </span>
    </Engine.Increment>
  );
}

// NO directive: the server-safe RadioGroup shell (ARCHITECTURE.md §9.5, §16.1). It renders a
// <Fieldset role="radiogroup"> (legend, description and error stay server HTML) and hands
// serialisable props to the RadioGroupScope client leaf, which each Radio reads. Native radios that
// share a name give arrow-key movement and one checked radio with no JavaScript, before hydration.
import { useId, type ReactElement, type ReactNode } from 'react';
import type { ChangeDetails } from '../contracts/details';
import type { Orientation } from '../contracts/state';
import { Fieldset, type FieldsetProps } from '../fieldset/fieldset';
import { cx } from '../_internal/cx';
import { presented } from '../_internal/field';
import { RadioGroupScope } from './radio-group.client';

/** Every change comes from the native `change` event of the radio that became checked. */
export type RadioGroupChangeReason = 'input';

export interface RadioGroupProps extends Omit<
  FieldsetProps,
  'children' | 'role' | 'name' | 'defaultValue' | 'onChange'
> {
  /** The name every radio submits under. @default a generated name, unique per group */
  name?: string;
  /** Controlled: the checked radio's `value`, or `null` for none. */
  value?: string | null;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Called with the newly checked radio's `value`, after that radio's own `onChange`. */
  onValueChange?: (value: string, details: ChangeDetails<RadioGroupChangeReason>) => void;
  /** Layout of the radios; native arrow keys move both ways either way. @default 'vertical' */
  orientation?: Orientation;
  /** `Radio` elements, possibly with other content between them. */
  children?: ReactNode;
}

/**
 * A native `<fieldset role="radiogroup">` with a `<legend>` (Fieldset), plus `aria-required` and
 * `aria-invalid`, which role `group` does not allow but `radiogroup` does (FIELD-CONTRACT.md).
 * `required` marks the legend and makes every radio `required`; `disabled` is the fieldset's own.
 */
export function RadioGroup({
  name,
  value,
  defaultValue,
  onValueChange,
  orientation = 'vertical',
  required = false,
  className,
  children,
  ...rest
}: RadioGroupProps): ReactElement {
  const generated = useId();
  return (
    <Fieldset
      {...rest}
      required={required}
      role="radiogroup"
      aria-required={required || undefined}
      aria-invalid={presented(rest.error) || undefined}
      data-slot="radio-group"
      data-orientation={orientation}
      className={cx('nz-radio-group', className)}
    >
      {/* Every prop here crosses the server/client boundary; onValueChange only from client code
          (or as a Server Action). */}
      <RadioGroupScope
        name={name ?? `${generated}-radio`}
        value={value}
        defaultValue={defaultValue}
        required={required}
        onValueChange={onValueChange}
      >
        {children}
      </RadioGroupScope>
    </Fieldset>
  );
}

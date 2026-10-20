// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Formats once, where it first renders
// (§16.4); CountUp (@nizivo/react/motion) formats its frames and its final text with formatNumber, so
// the server HTML and the client agree.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface NumberValueState {
  value: number;
  /** The formatted text the element shows. */
  text: string;
}

export interface NumberValueProps extends Omit<
  ComponentPropsWithRef<'data'>,
  'value' | 'children'
> {
  /** The number. The element's `value` attribute carries it unformatted, for machines. */
  value: number;
  /** `Intl.NumberFormat` options (serialisable, so a Server Component can pass them). @default {} */
  format?: Intl.NumberFormatOptions | undefined;
  /** BCP 47 tag for the number. @default 'en-US' */
  locale?: string | undefined;
  render?: RenderProp<NumberValueState>;
}

/** The text NumberValue renders for `value`: `Intl.NumberFormat(locale, format)`, nothing else. */
export function formatNumber(
  value: number,
  format: Intl.NumberFormatOptions = {},
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, format).format(value);
}

/**
 * A formatted number in a `<data>` element: tabular figures, isolated from the surrounding direction,
 * never wrapped inside the number (§16.4). It takes the surrounding font; Metric gives it Numeric/*.
 */
export function NumberValue({
  value,
  format,
  locale = 'en-US',
  render,
  className,
  ...rest
}: NumberValueProps): ReactElement {
  const text = formatNumber(value, format, locale);
  return renderElement(
    'data',
    render,
    { value, text },
    {
      'data-slot': 'number-value',
      ...rest,
      value: String(value),
      className: cx('nz-number-value', className),
      children: text,
    },
  );
}

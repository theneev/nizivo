// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). `useId` is the one hook a server
// part may call; geometry is the native <progress> element's, never an inline style (§19.3).
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** The bar's colour: `brand`, `success`, `warning`, `critical` or `neutral`. */
export type ProgressBarTone = 'brand' | 'success' | 'warning' | 'critical' | 'neutral';

export interface ProgressBarState {
  tone: ProgressBarTone;
  /** The clamped value, or `null` while indeterminate. */
  value: number | null;
  max: number;
  indeterminate: boolean;
}

export interface ProgressBarProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Clamped to `0…max`. @default 0 */
  value?: number;
  /** Must be above zero. @default 100 */
  max?: number;
  /** The visible name. Without it, name the bar with `aria-label` or `aria-labelledby`. */
  label?: ReactNode;
  /** Shows the value as a percentage beside the label (hidden from assistive technology, which reads the bar itself). @default true */
  showValue?: boolean;
  /** Work is under way but its amount is unknown: the bar has no value. @default false */
  indeterminate?: boolean;
  /** @default 'brand' */
  tone?: ProgressBarTone;
  /** BCP 47 tag for the percentage. @default 'en-US' */
  locale?: string;
  /** Replaces the shown percentage and is read instead of it, for example "3 of 5 steps". */
  valueText?: string;
  /** Composition of the root; the native `<progress>` inside keeps its semantics. */
  render?: RenderProp<ProgressBarState>;
}

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = true,
  indeterminate = false,
  tone = 'brand',
  locale = 'en-US',
  valueText,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  render,
  className,
  ...rest
}: ProgressBarProps): ReactElement {
  const labelId = useId();
  const range = Number.isFinite(max) && max > 0 ? max : 100;
  const current = indeterminate ? null : clamp(value, range);
  const shown =
    current === null
      ? undefined
      : (valueText ??
        new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
          current / range,
        ));
  const hasLabel = label != null;
  const hasValue = showValue && shown !== undefined;
  return renderElement(
    'div',
    render,
    { tone, value: current, max: range, indeterminate },
    {
      'data-slot': 'progress-bar',
      'data-tone': tone,
      ...rest,
      className: cx('nz-progress-bar', className),
      children: (
        <>
          {(hasLabel || hasValue) && (
            <div className="nz-progress-bar-header" data-slot="progress-bar-header">
              {hasLabel && (
                <span id={labelId} className="nz-progress-bar-label" data-slot="progress-bar-label">
                  {label}
                </span>
              )}
              {hasValue && (
                <span
                  className="nz-progress-bar-value"
                  data-slot="progress-bar-value"
                  aria-hidden="true"
                >
                  {shown}
                </span>
              )}
            </div>
          )}
          <progress
            className="nz-progress-bar-track"
            data-slot="progress-bar-track"
            max={range}
            value={current ?? undefined}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy ?? (hasLabel ? labelId : undefined)}
            aria-valuetext={current === null ? undefined : valueText}
          />
        </>
      ),
    },
  );
}

function clamp(value: number, max: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : 0;
}

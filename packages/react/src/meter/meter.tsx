// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). `useId` is the one hook a server
// part may call; geometry is the native <meter> element's, never an inline style (§19.3).
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** The colour of the optimum region. Outside it the browser's ranges pick warning, then critical. */
export type MeterTone = 'brand' | 'success' | 'warning' | 'critical' | 'neutral';

export interface MeterState {
  tone: MeterTone;
  /** The value clamped to `min…max`. */
  value: number;
  min: number;
  max: number;
}

export interface MeterProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** A measurement within a known range (storage used, stock left), not progress. Clamped to `min…max`. */
  value: number;
  /** @default 0 */
  min?: number;
  /** Must be above `min`. @default 100 */
  max?: number;
  /** Upper end of the low range. */
  low?: number;
  /** Lower end of the high range. */
  high?: number;
  /**
   * The best value. Without it the browser puts the optimum in the middle of the range. For a quota or
   * usage meter where high is bad, set `optimum={min}`; for stock, where low is bad, set `optimum={max}`.
   */
  optimum?: number;
  /** The visible name. Without it, name the meter with `aria-label` or `aria-labelledby`. */
  label?: ReactNode;
  /** Shows the value beside the label (hidden from assistive technology, which reads the meter itself). @default true */
  showValue?: boolean;
  /** @default 'brand' */
  tone?: MeterTone;
  /** BCP 47 tag for the percentage. @default 'en-US' */
  locale?: string;
  /** Replaces the shown percentage and is read instead of it, for example "310 of 500". */
  valueText?: string;
  /** Composition of the root; the native `<meter>` inside keeps its semantics. */
  render?: RenderProp<MeterState>;
}

export function Meter({
  value,
  min = 0,
  max = 100,
  low,
  high,
  optimum,
  label,
  showValue = true,
  tone = 'brand',
  locale = 'en-US',
  valueText,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  render,
  className,
  ...rest
}: MeterProps): ReactElement {
  const labelId = useId();
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) && max > lo ? max : lo + 100;
  const current = Number.isFinite(value) ? Math.min(Math.max(value, lo), hi) : lo;
  const shown =
    valueText ??
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
      (current - lo) / (hi - lo),
    );
  const hasLabel = label != null;
  return renderElement(
    'div',
    render,
    { tone, value: current, min: lo, max: hi },
    {
      'data-slot': 'meter',
      'data-tone': tone,
      ...rest,
      className: cx('nz-meter', className),
      children: (
        <>
          {(hasLabel || showValue) && (
            <div className="nz-meter-header" data-slot="meter-header">
              {hasLabel && (
                <span id={labelId} className="nz-meter-label" data-slot="meter-label">
                  {label}
                </span>
              )}
              {showValue && (
                <span className="nz-meter-value" data-slot="meter-value" aria-hidden="true">
                  {shown}
                </span>
              )}
            </div>
          )}
          <meter
            className="nz-meter-track"
            data-slot="meter-track"
            min={lo}
            max={hi}
            value={current}
            low={finite(low)}
            high={finite(high)}
            optimum={finite(optimum)}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy ?? (hasLabel ? labelId : undefined)}
            aria-valuetext={valueText}
          />
        </>
      ),
    },
  );
}

function finite(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

// NO directive: UsageMeter is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's
// Usage Meter 7411:307). How much AI usage is left, set out before people run out: a Meter with the
// value written out ("640 / 1,000") and a note ("Resets on Nov 1"). A screen reader hears the meter
// as "640 of 1,000 credits used"; from 80 % the bar turns to chart/warning (Meter's high range), and
// it never blocks silently. UNSTABLE: the AI kit is new and unreviewed.
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { SparklesGlyph } from '../../_internal/glyphs';
import { formatLabel } from '../../i18n/format-label';
import { Meter } from '../../meter/index';

/** UsageMeter's own strings (§16.4): serialisable, English defaults. */
export interface UsageMeterLabels {
  /**
   * The visible name, unless `label` is given.
   * @default 'AI credits'
   */
  label: string;
  /**
   * What a screen reader hears for the meter: `{value}` and `{max}`.
   * @default '{value} of {max} credits used'
   */
  valueText: string;
}

export interface UsageMeterProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** How much is used. */
  value: number;
  /** The allowance. */
  max: number;
  /** The visible name. Replaces `labels.label`. */
  label?: ReactNode;
  /** A line under the bar: when it resets, how to get more. */
  note?: ReactNode;
  /** The share from which the bar warns. @default 0.8 */
  warnAt?: number;
  /** BCP 47 tag for the numbers. @default 'en-US' */
  locale?: string;
  labels?: Partial<UsageMeterLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function UsageMeter({
  value,
  max,
  label,
  note,
  warnAt = 0.8,
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: UsageMeterProps): ReactElement {
  const labelId = useId();
  const number = new Intl.NumberFormat(locale);
  const shown = { value: number.format(value), max: number.format(max) };
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'usage-meter',
      ...rest,
      className: cx('nz-usage-meter', className),
      children: (
        <>
          <div className="nz-usage-meter-header">
            <span id={labelId} className="nz-usage-meter-label" data-slot="usage-meter-label">
              <span className="nz-usage-meter-icon" aria-hidden="true">
                <SparklesGlyph />
              </span>
              {label ?? labels?.label ?? 'AI credits'}
            </span>
            <span className="nz-usage-meter-value" data-slot="usage-meter-value" aria-hidden="true">
              {shown.value} / {shown.max}
            </span>
          </div>
          <Meter
            className="nz-usage-meter-bar"
            value={value}
            max={max}
            high={max * warnAt}
            optimum={0}
            showValue={false}
            aria-labelledby={labelId}
            valueText={formatLabel(
              labels?.valueText ?? '{value} of {max} credits used',
              shown,
              locale,
            )}
          />
          {note != null && (
            <p className="nz-usage-meter-note" data-slot="usage-meter-note">
              {note}
            </p>
          )}
        </>
      ),
    },
  );
}

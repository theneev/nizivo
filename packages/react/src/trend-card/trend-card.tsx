// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma's "Revenue Card" (master
// 752:385, on canvas since figma/14's 2026-10-18 changes; instance 7275:13818, figma/04 §4.5) as a
// generic part: Card's surface (padding md = 24, radius xl, no shadow at rest: decision 8j), a Metric
// in its display size, an action slot (the period picker), the chart, the legend and a footer. Every
// slot is an element: a client Select or a charts island arrives through it, so this part ships no
// client code of its own, and core never imports @nizivo/charts. "Revenue card" is a docs example
// (trend-card.example.tsx), not an export.
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { dataStatusAttrs, type DataStatus } from '../_internal/data-status';
import type { CardTone } from '../card/card';
import { Metric, resolveStatus, type MetricDataProps } from '../metric/metric';

export interface TrendCardState {
  /** The status as rendered: `'empty'` when a ready card has no value. */
  status: DataStatus;
  pending: boolean;
  tone: CardTone;
}

export interface TrendCardProps
  extends MetricDataProps, Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Card's tone; `inverse` scopes the inverse scheme. @default 'surface' */
  tone?: CardTone;
  /** The control at the end of the header, for example the period `Select` or a `SegmentedControl`. */
  action?: ReactNode;
  /**
   * The chart, for example `<AreaChart … />` from `@nizivo/charts`. Rendered in every status, so the
   * box stays put: give the chart the same `status` (ChartFrame keeps its box in all four).
   */
  chart?: ReactNode;
  /** The legend under the chart, for example `<Legend items={…} />`. */
  legend?: ReactNode;
  /** A last row, for example a link to the report. */
  footer?: ReactNode;
  render?: RenderProp<TrendCardState>;
}

/**
 * A headline number with its change, a period control and a comparison chart. A `role="group"`
 * named by the label. The status contract (§16.5) applies to the headline; the slots render as given.
 */
export function TrendCard({
  label,
  value,
  format,
  locale,
  delta,
  comparison,
  tone = 'surface',
  action,
  chart,
  legend,
  footer,
  status = 'ready',
  pending = false,
  empty,
  error,
  labels,
  render,
  className,
  ...rest
}: TrendCardProps): ReactElement {
  const labelId = useId();
  const st = resolveStatus(status, value);
  const busy = st === 'ready' && pending;
  return renderElement(
    'div',
    render,
    { status: st, pending: busy, tone },
    {
      // Card's surface by its class and attributes (card.css): tone, padding md, no elevation
      'data-slot': 'trend-card',
      'data-tone': tone,
      'data-padding': 'md',
      'data-nz-scheme': tone === 'inverse' ? 'inverse' : undefined,
      ...dataStatusAttrs(st, busy),
      role: 'group',
      'aria-labelledby': labelId,
      ...rest,
      className: cx('nz-card', 'nz-trend-card', className),
      children: (
        <>
          <div className="nz-trend-card-header" data-slot="trend-card-header">
            <Metric
              size="display"
              reserveChange
              labelId={labelId}
              label={label}
              value={value}
              format={format}
              locale={locale}
              delta={delta}
              comparison={comparison}
              status={status}
              pending={pending}
              empty={empty}
              error={error}
              labels={labels}
            />
            {action != null && (
              <div className="nz-trend-card-action" data-slot="trend-card-action">
                {action}
              </div>
            )}
          </div>
          {chart != null && (
            <div className="nz-trend-card-chart" data-slot="trend-card-chart">
              {chart}
            </div>
          )}
          {legend != null && (
            <div className="nz-trend-card-legend" data-slot="trend-card-legend">
              {legend}
            </div>
          )}
          {footer != null && (
            <div className="nz-trend-card-footer" data-slot="trend-card-footer">
              {footer}
            </div>
          )}
        </>
      ),
    },
  );
}

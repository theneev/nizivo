// NO directive: the tooltip card renders anywhere (Figma 03 "Chart Tooltip", 7275:13303 and the
// copy 747:287 the charts place). Its content is pre-formatted strings, so it is server-safe and
// serialisable: the ChartInteraction island shows it at the active point, and a third-party
// renderer inside <ChartFrame> can render the same card for its own tooltip. Showing, placing and
// announcing it are the island's job, not the card's.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { cx } from '../_shared/cx';
import type { ChartSeries } from '../legend/legend';

/**
 * The direction of a change, as `data-trend` (contracts/vocabulary.json). Sparkline derives it from
 * its data; ChartTooltip takes it from `delta.trend` (AreaChart derives that from the change).
 */
export type ChartTrend = 'up' | 'down' | 'flat';

export interface ChartTooltipRow {
  /** The series name, for example "This period". */
  label: string;
  /** The pre-formatted value, for example "$6,284" (Numeric/M, tabular). */
  value: string;
  /** The colour role of the row's swatch. */
  series: ChartSeries;
}

export interface ChartTooltipDelta {
  /** The pre-formatted change with its sign, for example "+28.0%": the sign is the non-colour cue. */
  value: string;
  /** For example "vs previous". */
  label?: string | undefined;
  /** `up` reads text/success, `down` text/critical, `flat` text/secondary. */
  trend: ChartTrend;
}

export interface ChartTooltipProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'title' | 'children'
> {
  /** The point, for example "Tue, Oct 14" (Label/M Strong). */
  title: string;
  /** One row per series; Figma's `Series` variant is `rows.length`. */
  rows: readonly ChartTooltipRow[];
  delta?: ChartTooltipDelta | undefined;
}

export function ChartTooltip({
  title,
  rows,
  delta,
  className,
  ...rest
}: ChartTooltipProps): ReactElement {
  return (
    <div data-slot="chart-tooltip" {...rest} className={cx('nz-chart-tooltip', className)}>
      <p className="nz-chart-tooltip-title">{title}</p>
      <dl className="nz-chart-tooltip-rows">
        {rows.map((row) => (
          <div key={row.label} className="nz-chart-tooltip-row">
            <dt className="nz-chart-tooltip-label">
              <span
                className="nz-chart-tooltip-swatch"
                data-series={row.series}
                aria-hidden="true"
              />
              {row.label}
            </dt>
            <dd className="nz-chart-tooltip-value">{row.value}</dd>
          </div>
        ))}
      </dl>
      {delta !== undefined && (
        <p className="nz-chart-tooltip-delta" data-trend={delta.trend}>
          <span className="nz-chart-tooltip-change">{delta.value}</span>
          {delta.label !== undefined && (
            <>
              {' '}
              <span className="nz-chart-tooltip-comparison">{delta.label}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

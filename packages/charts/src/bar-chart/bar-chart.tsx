// NO directive: BarChart renders its whole picture on the server (ARCHITECTURE.md §14.1; Figma 03
// "Bar Chart", 7275:13387). Counts per period: one bar per datum, at most 22 px wide, rounded only
// at the data end, on a value domain niced BEFORE its ticks, so no bar rises above the top tick
// (Figma 03's defect).
//
// Geometry without inline style (CSP Profile B) and without a 22 px that stretches with the plot:
// - Each datum is one HTML band, a track of an n-column grid (the same tracks as ChartFrame's band
//   x labels, so a label is centred under its bar whatever the width, and `direction` mirrors them
//   together for xDirection="rtl").
// - In each band an <svg> with NO viewBox, so its user unit stays one CSS pixel; CSS caps its width
//   at min(22 px, 52 % of the band): Figma's 22 px bar in a 42.3 px step.
// - Inside it a nested <svg> is the clip, from the baseline up (or down for a negative value), and
//   the bar is a <rect> with percentage attributes that runs from the data end past the clip: its
//   rounded corners (rx = radius/xs, 4 px) show only at the data end.
// - The band is the hit area (the whole column, Figma's note), and hover dims the other bars by
//   opacity and shows the band's tooltip, in CSS alone (bar-chart.css): no client JavaScript.
//   The same rules follow `data-highlighted` on a band, the hook the ChartInteraction island's
//   roving keyboard index will set; until then the data table is the keyboard and screen-reader
//   path and the frame makes no keyboard claim (`interaction="none"`).
import type { ReactElement } from 'react';
import { linear, valueDomain } from '../_core/scale';
import { everyNth, isPlainDate, plainDateFormat, tickEvery } from '../_core/time-ticks';
import { pct } from '../_core/geometry';
import { cx } from '../_shared/cx';
import { ChartFrame, type ChartFrameElementProps } from '../chart-frame/chart-frame';
import type { ChartFrameLabels } from '../chart-frame/chart-frame.contract';

/** BarChart's own strings (§16.4). Never concatenated: each is a whole label. */
export interface BarChartLabels {
  /** The data table's first column header (the x values). */
  category: string;
  /** The series' name: the data table's value column and the tooltip row. */
  value: string;
  /** The data table cell of a datum with no finite value. */
  missing: string;
}

/** English defaults (§16.4); pass `labels` to translate per instance. */
export const barChartLabels: BarChartLabels = {
  category: 'Category',
  value: 'Value',
  missing: 'No value',
};

export interface BarChartXTicks {
  /** Bars between labels. Derived from `max` when absent. */
  every?: number;
  /** At most this many x labels, the first and last always included. @default 8 */
  max?: number;
}

export interface BarChartProps<T> extends Omit<
  ChartFrameElementProps,
  'table' | 'ticks' | 'axes' | 'interaction' | 'children' | 'labels'
> {
  data: readonly T[];
  /** The category of a datum: an ISO plain date (`'2026-10-14'`, formatted per `locale`) or a label. */
  x: (datum: T) => string;
  /** The value of a datum. A non-finite value draws no bar. */
  y: (datum: T) => number;
  /** BCP 47 locale every number and date is formatted in, once, on the server (§16.4). @default 'en-US' */
  locale?: string;
  /** Values in the table and the tooltip. @default { maximumFractionDigits: 0 } */
  format?: Intl.NumberFormatOptions;
  /** The y labels. @default `format` with `notation: 'compact'` and at most one fraction digit */
  axisFormat?: Intl.NumberFormatOptions;
  /** ISO plain dates on the x axis. @default { month: 'short', day: 'numeric' } */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** ISO plain dates in the tooltip title and the table. @default { weekday: 'short', month: 'short', day: 'numeric' } */
  longDateFormat?: Intl.DateTimeFormatOptions;
  xTicks?: BarChartXTicks;
  /** About how many y ticks; the domain is niced for this count. @default 4 */
  yTicks?: number;
  labels?: Partial<ChartFrameLabels & BarChartLabels>;
}

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
const WHOLE: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
const NO_TICKS: BarChartXTicks = {};

export function BarChart<T>({
  data,
  x,
  y,
  locale = 'en-US',
  format = WHOLE,
  axisFormat,
  dateFormat,
  longDateFormat = LONG_DATE,
  xTicks = NO_TICKS,
  yTicks = 4,
  labels,
  className,
  ...frame
}: BarChartProps<T>): ReactElement {
  const L: BarChartLabels & Partial<ChartFrameLabels> = { ...barChartLabels, ...labels };
  const number = new Intl.NumberFormat(locale, format);
  const axis = new Intl.NumberFormat(
    locale,
    axisFormat ?? {
      ...format,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    },
  );
  const shortDate = plainDateFormat(locale, dateFormat);
  const longDate = plainDateFormat(locale, longDateFormat);

  const domain = valueDomain(data.map(y), { count: yTicks });
  const sy = linear(domain, [100, 0]);
  const ticks = sy.ticks(yTicks);
  const zero = sy(0);

  const n = data.length;
  const every = xTicks.every ?? tickEvery(n, xTicks.max ?? 8);
  const shown = new Set(everyNth(n, every));

  // one pass: the table row, the x label and the band (its bar and its tooltip) of each datum
  const rows: string[][] = [];
  const xs: string[] = [];
  const bands: ReactElement[] = [];
  data.forEach((datum, i) => {
    const key = x(datum);
    const date = isPlainDate(key);
    const value = y(datum);
    const title = date ? longDate(key) : key;
    const shownValue = Number.isFinite(value) ? number.format(value) : L.missing;
    rows.push([title, shownValue]);
    xs.push(shown.has(i) ? (date ? shortDate(key) : key) : '');
    bands.push(
      <div
        // oxlint-disable-next-line react/no-array-index-key -- a band's position is its identity (x may repeat)
        key={i}
        className={cx('nz-bar-chart-band', i >= n / 2 && 'nz-bar-chart-band-end')}
        data-slot="bar-chart-band"
      >
        {Number.isFinite(value) && value !== 0 && bar(sy(value), zero)}
        <span className="nz-bar-chart-tooltip">
          <span className="nz-bar-chart-tooltip-title">{title}</span>
          <span className="nz-bar-chart-tooltip-mark" data-series="current" />
          {L.value}
          <span className="nz-bar-chart-tooltip-value">{shownValue}</span>
        </span>
      </div>,
    );
  });

  return (
    <ChartFrame
      {...frame}
      className={cx('nz-bar-chart', className)}
      labels={L}
      interaction="none"
      table={{ columns: [L.category, L.value], rows }}
      ticks={{ x: xs, xAlign: 'band', y: ticks.toReversed().map((tick) => axis.format(tick)) }}
    >
      <svg className="nz-bar-chart-grid" aria-hidden="true">
        {ticks.map((tick) => {
          const at = pct(sy(tick));
          return (
            <line
              key={tick}
              className={tick === 0 ? 'nz-chart-baseline' : 'nz-chart-grid'}
              x1="0"
              x2="100%"
              y1={at}
              y2={at}
            />
          );
        })}
      </svg>
      <div className="nz-bar-chart-bands" aria-hidden="true">
        {bands}
      </div>
    </ChartFrame>
  );
}

/**
 * One bar, `top` its data end and `zero` the baseline (percent of the plot, y down). The nested
 * <svg> clips at the baseline; the <rect> starts at the data end and is twice as tall as the clip,
 * so it always runs past the baseline (even a bar that fills the clip) and only its data-end
 * corners are rounded. A negative bar hangs from the baseline: its rect ends at the data end.
 */
function bar(top: number, zero: number): ReactElement {
  const up = top < zero;
  const span = up ? zero : 100 - zero;
  const y = up ? (top / zero) * 100 : ((top - zero) / span) * 100 - 200;
  return (
    <svg className="nz-bar-chart-svg">
      <svg y={up ? '0' : pct(zero)} height={pct(span)}>
        <rect
          className="nz-bar-chart-bar"
          data-series="current"
          width="100%"
          height="200%"
          y={pct(y)}
          rx="4"
        />
      </svg>
    </svg>
  );
}

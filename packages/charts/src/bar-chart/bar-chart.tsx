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
// - The band is the hit area (the whole column, Figma's note). By default (`interaction="nizivo"`)
//   the ChartInteraction island's column mode drives the bands (M40 item 2): one tab stop over the
//   plot, ArrowLeft / ArrowRight / Home / End rove over the bars, the active band gets
//   `data-highlighted` (bar-chart.css dims the other bars by opacity), the island shows Figma 03's
//   ChartTooltip card beside it and the polite region speaks it; hover does the same without
//   speaking; Escape dismisses the card wherever focus is (WCAG 1.4.13: dismissable, persistent;
//   the card follows the band under the pointer). Every string the island shows or speaks is
//   formatted here, on the server. Before hydration the chart is drawn and the data table is in
//   the markup; nothing reacts until the island hydrates.
// - `interaction="none"` renders no island (webpack then ships no chart JavaScript; Turbopack and
//   next dev still ship the imported island module, as AreaChart's /chart-area-static measures in
//   fixtures/next): hover dims the other bars and shows the band's own tooltip in CSS alone
//   (hover-only: no Escape, so it does not meet WCAG 1.4.13), and the frame makes no keyboard
//   claim; `tableView="details"` gives sighted keyboard users the values.
import { useId, type ReactElement } from 'react';
import {
  accessor,
  compactOf,
  finite,
  INTL_DEFAULT,
  listSeparators,
  LONG_DATE,
  NO_TICKS,
  type CartesianChartOptions,
  type ChartFramePassthrough,
} from '../_core/api';
import { linear, valueDomain } from '../_core/scale';
import { everyNth, isPlainDate, plainDateFormat, tickEvery } from '../_core/time-ticks';
import { pct } from '../_core/geometry';
import { cx } from '../_shared/cx';
import { ChartInteraction, type ChartInteractionPoint } from '../_island/chart-interaction.client';
import { ChartFrame, chartFrameLabels } from '../chart-frame/chart-frame';
import type { ChartFrameLabels } from '../chart-frame/chart-frame.contract';

/** BarChart's strings (§16.4), with ChartFrame's. Never concatenated: each is a whole label. */
export interface BarChartLabels extends ChartFrameLabels {
  /** The data table's first column header (the x values). */
  category: string;
  /** The series' name: the data table's value column and the tooltip row. */
  value: string;
  /** The data table cell (and the tooltip value) of a datum with no finite value. */
  missing: string;
  /** The interactive layer's role, as assistive technology names it. */
  interaction: string;
  /** The interactive layer's keyboard instructions. */
  hint: string;
  /** The interactive layer's name when `title` is not a string. */
  points: string;
}

/** English defaults (§16.4); pass `labels` to translate per instance. */
export const barChartLabels: BarChartLabels = {
  ...chartFrameLabels,
  category: 'Category',
  value: 'Value',
  missing: 'No value',
  interaction: 'interactive chart',
  hint: 'Arrow keys move between bars; Home and End go to the first and last',
  points: 'Chart bars',
};

/**
 * BarChart's props: the shared cartesian options (`_core/api.ts`; `xTicks.max` defaults to 8 here)
 * and ChartFrame's, the `<figure>`'s attributes included.
 */
export interface BarChartProps<T> extends CartesianChartOptions<T>, ChartFramePassthrough<'axes'> {
  labels?: Partial<BarChartLabels>;
}

export function BarChart<T>({
  data,
  x,
  y,
  locale = 'en-US',
  format = INTL_DEFAULT,
  axisFormat,
  dateFormat,
  longDateFormat = LONG_DATE,
  xTicks = NO_TICKS,
  yTicks = 4,
  labels,
  title,
  interaction = 'nizivo',
  className,
  ...frame
}: BarChartProps<T>): ReactElement {
  const L: BarChartLabels = { ...barChartLabels, ...labels };
  const hintId = useId();
  // without the island, each band carries its own CSS-only tooltip (zero client JavaScript)
  const css = interaction === 'none';
  const number = new Intl.NumberFormat(locale, format);
  const axis = new Intl.NumberFormat(locale, axisFormat ?? compactOf(format));
  const shortDate = plainDateFormat(locale, dateFormat);
  const longDate = plainDateFormat(locale, longDateFormat);

  const xOf = accessor(x);
  const yOf = accessor(y);
  // not finite → NaN: no bar, the missing label, and left out of the domain
  const values = data.map((datum, i) => finite(yOf(datum, i)) ?? Number.NaN);
  const domain = valueDomain(values, { count: yTicks });
  const sy = linear(domain, [100, 0]);
  const ticks = sy.ticks(yTicks);
  const zero = sy(0);

  const n = data.length;
  const every = xTicks.every ?? tickEvery(n, xTicks.max ?? 8);
  const shown = new Set(everyNth(n, every));

  // one pass: the table row, the x label, the island's point and the band (its bar, and its
  // tooltip without the island) of each datum; a datum with no bar is still a band and a point
  const rows: string[][] = [];
  const xs: string[] = [];
  const points: ChartInteractionPoint[] = [];
  const bands: ReactElement[] = [];
  data.forEach((datum, i) => {
    const key = xOf(datum, i);
    const date = isPlainDate(key);
    const value = values[i] ?? Number.NaN;
    const heading = date ? longDate(key) : key;
    const shownValue = Number.isNaN(value) ? L.missing : number.format(value);
    rows.push([heading, shownValue]);
    points.push([heading, [shownValue], []]);
    xs.push(shown.has(i) ? (date ? shortDate(key) : key) : '');
    bands.push(
      <div
        // oxlint-disable-next-line react/no-array-index-key -- a band's position is its identity (x may repeat)
        key={i}
        className={cx('nz-bar-chart-band', css && i >= n / 2 && 'nz-bar-chart-band-end')}
        data-slot="bar-chart-band"
      >
        {/* NaN (no value) and 0 draw no bar */}
        {value ? bar(sy(value), zero) : null}
        {css && (
          <span className="nz-bar-chart-tooltip">
            <span className="nz-bar-chart-tooltip-title">{heading}</span>
            <span className="nz-bar-chart-tooltip-mark" data-series="current" />
            {L.value}
            <span className="nz-bar-chart-tooltip-value">{shownValue}</span>
          </span>
        )}
      </div>,
    );
  });

  return (
    <ChartFrame
      {...frame}
      className={cx('nz-bar-chart', className)}
      title={title}
      labels={L}
      interaction={interaction}
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
      {!css && (
        // column mode: the island roves over the bands (data-slot="bar-chart-band") and shows the
        // card; it paints over them, so CSS :hover on a band no longer fires under it
        <>
          <span id={hintId} className="nz-chart-visually-hidden">
            {L.hint}
          </span>
          <ChartInteraction
            // a new direction remounts the island, which reads the mirror once (A11Y-W11-1)
            key={frame.xDirection}
            series={[{ label: L.value, series: 'current' }]}
            points={points}
            separators={listSeparators(locale)}
            columns="bar-chart-band"
            aria-label={typeof title === 'string' ? title : L.points}
            aria-roledescription={L.interaction}
            aria-describedby={hintId}
          />
        </>
      )}
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

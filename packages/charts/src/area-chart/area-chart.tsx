// NO directive: AreaChart renders its whole SVG on the server (ARCHITECTURE.md §10.8, §14.1). It
// computes the niced value domain, the ticks, the paths and every string once, here, with an
// explicit locale (§16.4), then hands ChartFrame the caption, the ticks, the data table and the
// legend, and the ChartInteraction island plain JSON. With interaction="none" it renders no island,
// so webpack ships no chart JavaScript; Turbopack and next dev still ship the imported island
// module (fixtures/next, /chart-area-static).
import { useId, type ReactElement, type ReactNode } from 'react';
import { curveMonotoneX, type CurveFactory } from 'd3-shape';
import {
  accessor,
  compactOf,
  finite,
  INTL_DEFAULT,
  listSeparators,
  LONG_DATE,
  NO_TICKS,
  type Accessor,
  type CartesianChartOptions,
  type ChartFramePassthrough,
} from '../_core/api';
import { num, VIEWBOX } from '../_core/geometry';
import { areaPath, dotPath, linePath, PATH_DIGITS, type PathPoint } from '../_core/path';
import { linear, valueDomain } from '../_core/scale';
import {
  everyNth,
  isPlainDate,
  plainDateFormat,
  plainDateValue,
  tickEvery,
  tickLabels,
} from '../_core/time-ticks';
import { cx } from '../_shared/cx';
import { ChartInteraction, type ChartInteractionPoint } from '../_island/chart-interaction.client';
import { ChartFrame, chartFrameLabels } from '../chart-frame/chart-frame';
import type { ChartFrameLabels } from '../chart-frame/chart-frame.contract';
import { Legend } from '../legend/legend';

/** AreaChart's strings (§16.4), with ChartFrame's. English defaults in `areaChartLabels`. */
export interface AreaChartLabels extends ChartFrameLabels {
  /** The data table's first column header when every x is an ISO plain date. */
  x: string;
  /** The data table's first column header when x holds labels (BarChart's `category`). */
  category: string;
  /** The series' name in the legend, the tooltip and the table. */
  current: string;
  /** The comparison's name. */
  previous: string;
  /** After the tooltip's change, for example "+28.0% vs previous". */
  delta: string;
  /** A value the series does not have at that point (BarChart's `missing` too). */
  missing: string;
  /** The interactive layer's role, as assistive technology names it. */
  interaction: string;
  /** The interactive layer's keyboard instructions. */
  hint: string;
  /** The interactive layer's name when `title` is not a string. */
  points: string;
}

export const areaChartLabels: AreaChartLabels = {
  ...chartFrameLabels,
  x: 'Date',
  category: 'Category',
  current: 'This period',
  previous: 'Previous',
  delta: 'vs previous',
  missing: 'No value',
  interaction: 'interactive chart',
  hint: 'Arrow keys move between points; Home and End go to the first and last',
  points: 'Chart points',
};

/**
 * AreaChart's props: the shared cartesian options (`_core/api.ts`), its own, and ChartFrame's,
 * the `<figure>`'s attributes included.
 */
export interface AreaChartProps<T>
  extends CartesianChartOptions<T>, Omit<ChartFramePassthrough, 'legend'> {
  /** The comparison series, drawn dashed in chart/neutral (decorative: the table carries it). */
  compare?: Accessor<T, number | null | undefined>;
  /** Any d3-shape curve factory. @default curveMonotoneX (no overshoot below the baseline) */
  curve?: CurveFactory;
  /** `true` shows the series key; the default shows it when there is a comparison. */
  legend?: ReactNode;
  labels?: Partial<AreaChartLabels>;
}

const DAY = 86_400_000;

export function AreaChart<T>({
  data,
  x,
  y,
  compare,
  locale = 'en-US',
  format = INTL_DEFAULT,
  axisFormat,
  dateFormat,
  longDateFormat = LONG_DATE,
  xTicks = NO_TICKS,
  yTicks: count = 4,
  curve = curveMonotoneX,
  legend,
  labels,
  title,
  interaction = 'nizivo',
  xDirection = 'ltr',
  className,
  ...rest
}: AreaChartProps<T>): ReactElement {
  const L: AreaChartLabels = { ...areaChartLabels, ...labels };
  const hintId = useId();
  const n = data.length;
  const xs = data.map(accessor(x));
  const series = [data.map((d, i) => finite(accessor(y)(d, i)))];
  if (compare !== undefined) series.push(data.map((d, i) => finite(accessor(compare)(d, i))));
  const [current = [], previous] = series;

  // NICE FIRST (§14.1): the domain's ends are ticks, so no value rises above the top label
  const domain = valueDomain(
    series.flat().map((v) => v ?? Number.NaN),
    { count },
  );
  const sy = linear(domain, [100, 0]);
  const ticks = sy.ticks(count);
  const baseline = sy(Math.min(Math.max(0, domain[0]), domain[1]));
  // the curve gets exact coordinates and rounds only what it writes (path.ts): rounding its inputs
  // would space the points unevenly and bend the slopes it computes (R2-1)
  const pointsOf = (values: ReadonlyArray<number | null>): PathPoint[] =>
    values.map((v, i) => (v === null ? null : [n === 1 ? 50 : (i / (n - 1)) * 100, sy(v)]));

  // format once, on the server (§16.4); the axis is compact, the tooltip and table are full
  const valueFormat = new Intl.NumberFormat(locale, format);
  const tickNumber = new Intl.NumberFormat(locale, axisFormat ?? compactOf(format));
  const change = new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const cell = (v: number | null | undefined): string =>
    v === null || v === undefined ? L.missing : valueFormat.format(v);

  const dates = n > 0 && xs.every(isPlainDate);
  const axisDate = dates ? plainDateFormat(locale, dateFormat) : undefined;
  const pointDate = dates ? plainDateFormat(locale, longDateFormat) : undefined;
  const titles = xs.map((v) => pointDate?.(v) ?? v);
  let every = xTicks.every ?? tickEvery(n, xTicks.max ?? 6);
  // a daily series ticks on whole weeks (Figma 03: Oct 1, 8, 15, 22 and the forced 30)
  if (xTicks.every === undefined && dates && every > 4) {
    const [first = '', second = ''] = xs;
    if ((plainDateValue(second) ?? 0) - (plainDateValue(first) ?? 0) === DAY)
      every = Math.ceil(every / 7) * 7;
  }

  const names = [L.current, L.previous];
  const kinds = ['current', 'previous'] as const;
  // the island's payload (M40 item 10): each series' name once, and per point a short tuple
  const points: ChartInteractionPoint[] = titles.map((heading, i) => {
    const values = series.map((s) => cell(s[i]));
    const dots = series.map((s) => {
      const v = s[i];
      return v == null ? null : Number(num(sy(v), PATH_DIGITS));
    });
    const now = current[i];
    const before = previous?.[i];
    if (now == null || before == null || before === 0) return [heading, values, dots];
    const ratio = (now - before) / Math.abs(before);
    // a flat change carries no trend: the island's default
    return ratio === 0
      ? [heading, values, dots, change.format(ratio)]
      : [heading, values, dots, change.format(ratio), ratio > 0 ? 'up' : 'down'];
  });
  const rows = series.map((_, s) => ({ label: names[s] ?? '', series: kinds[s] ?? 'current' }));

  const line = pointsOf(current);
  const end = line.findLast((p) => p !== null);
  const legendNode =
    legend === true || (legend === undefined && previous !== undefined) ? (
      <Legend items={rows} />
    ) : legend === false ? undefined : (
      legend
    );

  return (
    <ChartFrame
      {...rest}
      className={cx('nz-area-chart', className)}
      title={title}
      interaction={interaction}
      xDirection={xDirection}
      labels={L}
      legend={legendNode}
      table={{
        columns: [dates ? L.x : L.category, ...names.slice(0, series.length)],
        rows: titles.map((t, i) => [t].concat(series.map((s) => cell(s[i])))),
      }}
      ticks={{
        x: tickLabels(
          xs.map((v) => axisDate?.(v) ?? v),
          everyNth(n, every),
        ),
        xAlign: n === 1 ? 'band' : 'point',
        y: ticks.map((t) => tickNumber.format(t)).toReversed(),
      }}
    >
      <svg className="nz-chart-svg" viewBox={VIEWBOX} preserveAspectRatio="none" aria-hidden="true">
        {ticks.map(
          (t) =>
            t !== 0 && (
              <line
                key={t}
                className="nz-chart-grid"
                x1="0"
                x2="100"
                y1={num(sy(t), PATH_DIGITS)}
                y2={num(sy(t), PATH_DIGITS)}
              />
            ),
        )}
        <line
          className="nz-chart-baseline"
          x1="0"
          x2="100"
          y1={num(baseline, PATH_DIGITS)}
          y2={num(baseline, PATH_DIGITS)}
        />
        <path className="nz-chart-area" data-series="current" d={areaPath(line, baseline, curve)} />
        {previous !== undefined && (
          <path
            className="nz-chart-line"
            data-series="previous"
            d={linePath(pointsOf(previous), curve)}
          />
        )}
        <path className="nz-chart-line" data-series="current" d={linePath(line, curve)} />
        {end != null && (
          <>
            <path className="nz-area-chart-halo" d={dotPath(...end)} />
            <path className="nz-area-chart-dot" data-series="current" d={dotPath(...end)} />
          </>
        )}
      </svg>
      {interaction === 'nizivo' && (
        <>
          <span id={hintId} className="nz-chart-visually-hidden">
            {L.hint}
          </span>
          <ChartInteraction
            // a new direction remounts the island, which reads the mirror once (A11Y-W11-1)
            key={xDirection}
            series={rows}
            points={points}
            delta={L.delta}
            separators={listSeparators(locale)}
            aria-label={typeof title === 'string' ? title : L.points}
            aria-roledescription={L.interaction}
            aria-describedby={hintId}
          />
        </>
      )}
    </ChartFrame>
  );
}

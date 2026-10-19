// NO directive: AreaChart renders its whole SVG on the server (ARCHITECTURE.md §10.8, §14.1). It
// computes the niced value domain, the ticks, the paths and every string once, here, with an
// explicit locale (§16.4), then hands ChartFrame the caption, the ticks, the data table and the
// legend, and the ChartInteraction island plain JSON. A server-only page that sets
// interaction="none" ships no chart JavaScript at all.
import { useId, type ReactElement, type ReactNode } from 'react';
import { curveMonotoneX, type CurveFactory } from 'd3-shape';
import { num, VIEWBOX } from '../_core/geometry';
import { areaPath, dotPath, linePath, type PathPoint } from '../_core/path';
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
import {
  ChartFrame,
  chartFrameLabels,
  type ChartFrameAttributes,
} from '../chart-frame/chart-frame';
import type { ChartFrameLabels, ChartFrameProps } from '../chart-frame/chart-frame.contract';
import type { ChartTooltipDelta } from '../chart-tooltip/chart-tooltip';
import { Legend } from '../legend/legend';

/** A datum's field by key (serialisable), or a function of the datum. */
export type Accessor<T, V> =
  | { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T]
  | ((datum: T, index: number) => V);

/**
 * How values are formatted (§16.4): a preset or any `Intl.NumberFormat` options object, for example
 * `{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }`.
 */
export type ChartNumberFormat = 'number' | 'compact' | 'percent' | Intl.NumberFormatOptions;

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

export interface AreaChartProps<T> extends Omit<
  ChartFrameProps,
  'table' | 'ticks' | 'legend' | 'labels' | 'children'
> {
  /** In x order: one datum per point. */
  data: readonly T[];
  /** The x value: an ISO plain date (`'2026-10-01'`, daily or weekly buckets) or any label. */
  x: Accessor<T, string>;
  y: Accessor<T, number | null | undefined>;
  /** The comparison series, drawn dashed in chart/neutral (decorative: the table carries it). */
  compare?: Accessor<T, number | null | undefined>;
  /** @default 'en-US' */
  locale?: string;
  /** Values in the tooltip and the table. @default 'number' */
  format?: ChartNumberFormat;
  /** The y tick labels. @default `format` in compact notation ("$8K") */
  axisFormat?: ChartNumberFormat;
  /** Date tick labels. @default { month: 'short', day: 'numeric' } ("Oct 1") */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** A point's date in the tooltip and the table. @default { weekday: 'short', month: 'short', day: 'numeric' } */
  longDateFormat?: Intl.DateTimeFormatOptions;
  /** Points between x ticks; the last point always has one. Daily dates tick weekly by default. */
  xTickEvery?: number;
  /** Any d3-shape curve factory. @default curveMonotoneX (no overshoot below the baseline) */
  curve?: CurveFactory;
  /** `true` shows the series key; the default shows it when there is a comparison. */
  legend?: ReactNode;
  labels?: Partial<AreaChartLabels>;
}

export type AreaChartElementProps<T> = AreaChartProps<T> & ChartFrameAttributes;

const PRESETS: Record<string, Intl.NumberFormatOptions> = {
  compact: { notation: 'compact' },
  percent: { style: 'percent' },
};
const optionsOf = (format: ChartNumberFormat): Intl.NumberFormatOptions =>
  typeof format === 'string' ? (PRESETS[format] ?? {}) : format;

const DAY = 86_400_000;
const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

/** A finite number, or null: a gap in the series. */
const valueOf = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function read<T, V>(accessor: Accessor<T, V>): (datum: T, index: number) => V {
  return typeof accessor === 'function'
    ? accessor
    : // a key of T whose values are V (the Accessor type), read as such
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Accessor's key type guarantees V
      (datum) => datum[accessor] as V;
}

export function AreaChart<T>({
  data,
  x,
  y,
  compare,
  locale = 'en-US',
  format = 'number',
  axisFormat,
  dateFormat,
  longDateFormat = LONG_DATE,
  xTickEvery,
  curve = curveMonotoneX,
  legend,
  labels,
  title,
  interaction = 'nizivo',
  xDirection = 'ltr',
  className,
  ...rest
}: AreaChartElementProps<T>): ReactElement {
  const L: AreaChartLabels = { ...areaChartLabels, ...labels };
  const hintId = useId();
  const n = data.length;
  const xs = data.map(read(x));
  const series = [data.map((d, i) => valueOf(read(y)(d, i)))];
  if (compare !== undefined) series.push(data.map((d, i) => valueOf(read(compare)(d, i))));
  const [current = [], previous] = series;

  // NICE FIRST (§14.1): the domain's ends are ticks, so no value rises above the top label
  const domain = valueDomain(
    series.flat().map((v) => v ?? Number.NaN),
    { count: 4 },
  );
  const sy = linear(domain, [100, 0]);
  const ticks = sy.ticks(4);
  const baseline = sy(Math.min(Math.max(0, domain[0]), domain[1]));
  const px = (i: number): number => Number(num(n === 1 ? 50 : (i / (n - 1)) * 100));
  const py = (v: number | null | undefined): number | null =>
    v === null || v === undefined ? null : Number(num(sy(v)));
  const pointsOf = (values: ReadonlyArray<number | null>): PathPoint[] =>
    values.map((v, i) => {
      const at = py(v);
      return at === null ? null : [px(i), at];
    });

  // format once, on the server (§16.4); the axis is compact, the tooltip and table are full
  const valueFormat = new Intl.NumberFormat(locale, optionsOf(format));
  const tickNumber = new Intl.NumberFormat(
    locale,
    axisFormat === undefined
      ? {
          ...optionsOf(format),
          notation: 'compact',
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        }
      : optionsOf(axisFormat),
  );
  const change = new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const list = new Intl.ListFormat(locale, { type: 'unit', style: 'short' });
  const cell = (v: number | null | undefined): string =>
    v === null || v === undefined ? L.missing : valueFormat.format(v);

  const dates = n > 0 && xs.every(isPlainDate);
  const axisDate = dates ? plainDateFormat(locale, dateFormat) : undefined;
  const pointDate = dates ? plainDateFormat(locale, longDateFormat) : undefined;
  const titles = xs.map((v) => pointDate?.(v) ?? v);
  let every = xTickEvery ?? tickEvery(n, 6);
  // a daily series ticks on whole weeks (Figma 03: Oct 1, 8, 15, 22 and the forced 30)
  if (xTickEvery === undefined && dates && every > 4) {
    const [first = '', second = ''] = xs;
    if ((plainDateValue(second) ?? 0) - (plainDateValue(first) ?? 0) === DAY)
      every = Math.ceil(every / 7) * 7;
  }

  const names = [L.current, L.previous];
  const kinds = ['current', 'previous'] as const;
  const points: ChartInteractionPoint[] = xs.map((_, i) => {
    const values = series.map((s) => cell(s[i]));
    const now = current[i];
    const before = previous?.[i];
    let delta: ChartTooltipDelta | undefined;
    if (now != null && before != null && before !== 0) {
      const ratio = (now - before) / Math.abs(before);
      delta = {
        value: change.format(ratio),
        label: L.delta,
        trend: ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat',
      };
    }
    const heading = titles[i] ?? '';
    return {
      x: px(i),
      y: series.map((s) => py(s[i])),
      card: {
        title: heading,
        rows: values.map((value, s) => ({
          label: names[s] ?? '',
          value,
          series: kinds[s] ?? 'current',
        })),
        ...(delta === undefined ? {} : { delta }),
      },
      announce: list.format([
        heading,
        ...values.flatMap((value, s) => [names[s] ?? '', value]),
        ...(delta === undefined ? [] : [delta.value, L.delta]),
      ]),
    };
  });

  const line = pointsOf(current);
  const end = line.findLast((p) => p !== null);
  const legendNode =
    legend === true || (legend === undefined && previous !== undefined) ? (
      <Legend
        items={series.map((_, s) => ({ label: names[s] ?? '', series: kinds[s] ?? 'current' }))}
      />
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
                y1={num(sy(t))}
                y2={num(sy(t))}
              />
            ),
        )}
        <line className="nz-chart-baseline" x1="0" x2="100" y1={num(baseline)} y2={num(baseline)} />
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
            points={points}
            mirror={xDirection === 'rtl'}
            aria-label={typeof title === 'string' ? title : L.points}
            aria-roledescription={L.interaction}
            aria-describedby={hintId}
          />
        </>
      )}
    </ChartFrame>
  );
}

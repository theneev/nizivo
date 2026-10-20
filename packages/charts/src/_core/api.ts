// NO directive. The one API shape of the Nizivo charts (ARCHITECTURE.md §14.1; M40, 2026-10-20),
// defined once so AreaChart, BarChart, DonutChart and Sparkline take their data, their formats and
// their ticks the same way:
// - a datum's value is an `Accessor`: a key of the datum, or a `(datum, index)` function;
// - every `*Format` prop is plain `Intl.NumberFormatOptions` or `Intl.DateTimeFormatOptions`, as
//   react's Delta and Meter take them (no presets); numbers default to Intl's own format;
// - the x labels are `xTicks: { every?, max? }` and the y labels `yTicks` (about how many);
// - a chart's strings are `XLabels extends ChartFrameLabels`, defaults in `xLabels`, and `labels`
//   takes `Partial<XLabels>`;
// - a chart's `XProps` includes the `<figure>`'s attributes (ChartFrame's), as react's parts do,
//   and ChartFrame's own props through `ChartFramePassthrough` (`title`, `summary`,
//   `titleVisibility`, `status`, `tableView`…), so every chart takes them identically (M42).
import type { ChartFrameElementProps } from '../chart-frame/chart-frame';

/** A datum's field by key (serialisable from a Server Component), or a function of the datum. */
export type Accessor<T, V> =
  | { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T]
  | ((datum: T, index: number) => V);

/** The accessor as a function. */
export function accessor<T, V>(of: Accessor<T, V>): (datum: T, index: number) => V {
  return typeof of === 'function'
    ? of
    : // a key of T whose values are V (the Accessor type), read as such
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Accessor's key type guarantees V
      (datum) => datum[of] as V;
}

/** A finite number, or `null`: a gap in the series (or a datum with no bar). */
export const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** The x labels of a cartesian chart. */
export interface ChartXTicks {
  /** Data points (or bars) between labels; the last one always has a label. Derived from `max`. */
  every?: number;
  /** At most this many labels, the first and last included. AreaChart: 6, BarChart: 8. */
  max?: number;
}

/** What every cartesian chart (AreaChart, BarChart) takes for its data, its formats and its axes. */
export interface CartesianChartOptions<T> {
  /** In x order: one datum per point or bar. */
  data: readonly T[];
  /** The x value: an ISO plain date (`'2026-10-14'`, formatted per `locale`) or any label. */
  x: Accessor<T, string>;
  /** The value. A value that is not a finite number is a gap (no point, no bar). */
  y: Accessor<T, number | null | undefined>;
  /** The BCP 47 locale every number and date is formatted in, once, on the server (§16.4). @default 'en-US' */
  locale?: string;
  /** Values in the tooltip and the data table. @default Intl.NumberFormat's own ({}) */
  format?: Intl.NumberFormatOptions;
  /** The y labels. @default `format` in compact notation with at most one fraction digit ("$8K") */
  axisFormat?: Intl.NumberFormatOptions;
  /** ISO plain dates on the x axis. @default { month: 'short', day: 'numeric' } ("Oct 1") */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** ISO plain dates in the tooltip and the data table. @default { weekday: 'short', month: 'short', day: 'numeric' } */
  longDateFormat?: Intl.DateTimeFormatOptions;
  xTicks?: ChartXTicks;
  /** About how many y labels; the value domain is niced for this count. @default 4 */
  yTicks?: number;
}

/**
 * ChartFrame's props a chart passes through, with the `<figure>`'s attributes: everything but what
 * the chart computes itself (`table`, `ticks`, `children`) and its own `labels`, so `title`,
 * `summary`, `titleVisibility` (`'hidden'` keeps the caption as the figure's accessible name only),
 * `status`, `pending` and `tableView` are one prop in every chart. `Omitted` names what a chart
 * also decides itself (BarChart: `'axes'`).
 */
export type ChartFramePassthrough<Omitted extends keyof ChartFrameElementProps = never> = Omit<
  ChartFrameElementProps,
  'table' | 'ticks' | 'children' | 'labels' | Omitted
>;

/** `format`'s default in every chart: Intl.NumberFormat's own (a stable reference for a default prop). */
export const INTL_DEFAULT: Intl.NumberFormatOptions = {};

/** `xTicks`' default: `every` derived from the chart's `max`. */
export const NO_TICKS: ChartXTicks = {};

/** `longDateFormat`'s default: "Tue, Oct 14". */
export const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
};

/** `axisFormat`'s default: `format` in compact notation, at most one fraction digit ("$8K"). */
export const compactOf = (format: Intl.NumberFormatOptions): Intl.NumberFormatOptions => ({
  ...format,
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * The separators `Intl.ListFormat` (`type: 'unit'`, `style: 'short'`) writes in `locale`: between
 * two items, and before the last one ("Tue, Oct 14, Sales, $1,234"; German puts " und " before the
 * last). The island joins its spoken text with them, so it reads no locale itself.
 */
export function listSeparators(locale: string): [between: string, last: string] {
  const out: [string, string] = ['', ''];
  let item = -1;
  for (const part of new Intl.ListFormat(locale, { type: 'unit', style: 'short' }).formatToParts([
    'a',
    'b',
    'c',
  ])) {
    if (part.type === 'element') item += 1;
    else if (item === 0 || item === 1) out[item] += part.value;
  }
  return out;
}

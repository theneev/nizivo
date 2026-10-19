// NO directive. Time axes over ISO plain dates (ARCHITECTURE.md §14.1, §16.3): daily and weekly
// buckets are points on a point scale, labelled every Nth point with the last point forced, as
// Figma 03 draws them (30 daily points: Oct 1, 8, 15, 22, 30). Pure and deterministic: dates are
// read as UTC calendar days, never through the server's or the browser's time zone.

/** `YYYY-MM-DD`: the public date type everywhere in Nizivo (§16.3). */
export type PlainDate = string;

const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Milliseconds since the epoch of `date` at 00:00 UTC, or undefined when it is not a real ISO date. */
export function plainDateValue(date: string): number | undefined {
  const match = PLAIN_DATE.exec(date);
  if (match === null) return undefined;
  const [, y = '', m = '', d = ''] = match;
  const value = Date.UTC(Number(y), Number(m) - 1, Number(d));
  // Date.UTC rolls 2026-02-30 over to March: a real date round-trips
  return new Date(value).toISOString().slice(0, 10) === date ? value : undefined;
}

export function isPlainDate(date: string): boolean {
  return plainDateValue(date) !== undefined;
}

/** The number of points between ticks so that at most `max` ticks show (the forced last included). */
export function tickEvery(count: number, max: number): number {
  if (count <= 1 || max <= 1) return Math.max(1, count);
  return Math.max(1, Math.ceil((count - 1) / (max - 1)));
}

export interface EveryNthOptions {
  /**
   * A regular tick closer than this many points to the forced last one is dropped, so two labels
   * never crowd (Figma 03's bar chart prints "29" and "30" side by side). @default floor(every / 2) + 1,
   * so a gap of half a step or less is dropped
   */
  minGap?: number;
}

/**
 * Tick indices of `count` points: 0, every, 2·every, …, and `count - 1` always. The first and last
 * are always kept (ChartFrame clamps them inward, to opposite ends); only a middle tick can crowd
 * the last. Empty for no points.
 */
export function everyNth(count: number, every: number, options: EveryNthOptions = {}): number[] {
  if (count <= 0) return [];
  const step = Math.max(1, Math.floor(every));
  const minGap = options.minGap ?? Math.floor(step / 2) + 1;
  const last = count - 1;
  const out: number[] = [];
  for (let i = 0; i < last; i += step) if (i === 0 || last - i >= minGap) out.push(i);
  out.push(last);
  return out;
}

/**
 * One label per point, '' where no tick falls: what ChartFrame's `ticks.x` takes (its tracks are
 * one per point, so a label needs no position of its own).
 */
export function tickLabels(labels: readonly string[], indices: Iterable<number>): string[] {
  const keep = new Set(indices);
  return labels.map((label, i) => (keep.has(i) ? label : ''));
}

/** A plain-date formatter, fixed to UTC so server and client print the same day (§16.4). */
export function plainDateFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): (date: PlainDate) => string {
  const format = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
  return (date) => {
    const value = plainDateValue(date);
    if (value === undefined)
      throw new RangeError(`"${date}" is not an ISO plain date (YYYY-MM-DD)`);
    return format.format(value);
  };
}

export interface DateTicksOptions {
  /** Points between ticks; 7 labels a daily series weekly. Derived from `max` when absent. */
  every?: number;
  /** At most this many ticks when `every` is absent. @default 5 */
  max?: number;
  minGap?: number;
}

/**
 * Tick indices for a series of ISO plain dates (sorted, as a point scale draws them). Throws on a
 * value that is not a plain date, so a timestamp never slips onto a point axis.
 */
export function dateTicks(dates: readonly string[], options: DateTicksOptions = {}): number[] {
  const bad = dates.find((date) => !isPlainDate(date));
  if (bad !== undefined) throw new RangeError(`"${bad}" is not an ISO plain date (YYYY-MM-DD)`);
  const every = options.every ?? tickEvery(dates.length, options.max ?? 5);
  return everyNth(
    dates.length,
    every,
    options.minGap === undefined ? {} : { minGap: options.minGap },
  );
}

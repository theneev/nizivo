// NO directive: DonutChart renders its whole picture on the server (ARCHITECTURE.md §14.1; Figma 03
// "Donut Chart", 7275:13455). Share of a whole: at most three categories plus "Other", coloured
// chart/cat-1, cat-2, cat-3 and chart/neutral in that fixed order, never cycled.
//
// Folding (stable and documented, `foldCategories`): values that are not finite or not above zero
// are left out; the rest are ordered by value, largest first (ties keep their input order), or kept
// in input order with `sort="none"`; the first `maxCategories` (3) keep their colours and the rest
// fold into one "Other" slice, which keeps its own label when it is a single category.
//
// Geometry: a square viewBox centred on 0, outer radius 100 and inner radius 74 (Figma's 26 px ring
// on 200 px), starting at 12 o'clock and running clockwise. The gaps between segments are real
// gaps (the surface shows through, in every theme), 3 units wide with parallel sides (Figma: about
// 0.03 rad at the outer edge), and segment ends are flat. The paths are written here, in a dozen
// lines, instead of with d3-shape's arc and pie, which would cost more than the whole ring.
//
// Interaction. By default (`interaction="nizivo"`, M41 item 2) the ChartInteraction island's item
// mode drives the segments: one tab stop over the ring, ArrowLeft / ArrowRight (clockwise is data
// order: the ring is never mirrored) and Home / End rove over the slices, the first slice first (or
// the last one shown);
// the active segment gets `data-highlighted` (donut-chart.css dims the other segments and legend
// rows by opacity, swaps the centre to its share and name, and thickens its outline under forced
// colours); the island shows Figma 03's ChartTooltip card at the slice's centre (its value, and
// its share "of total"), and the polite region speaks "slice, value label, value, share, of total";
// a pointer does the same without speaking, picking the segment under it; Escape dismisses the card
// wherever focus is, and is consumed only on the ring itself (M41 item 1). Every string the island
// shows or speaks is formatted here, on the server. Before hydration the ring, the legend and the
// visually hidden data table are in the markup; nothing reacts until the island hydrates. A sliver
// thinner than the gap still has its (empty) segment, so the keys reach every slice in the table.
// `interaction="none"` renders no island (webpack then ships no chart JavaScript; Turbopack and
// next dev still ship the imported island module, as AreaChart's /chart-area-static measures):
// hover works in CSS alone (a segment, or its legend row, dims the others to 35 % and 45 %, Figma,
// and swaps the centre), and the frame makes no keyboard claim. In both modes the legend and the
// data table carry every value and share without a pointer; `tableView="details"` shows the table.
import { useId, type ReactElement, type ReactNode } from 'react';
import {
  accessor,
  compactOf,
  finite,
  INTL_DEFAULT,
  listSeparators,
  type Accessor,
  type ChartFramePassthrough,
} from '../_core/api';
import { num } from '../_core/geometry';
import { cx } from '../_shared/cx';
import {
  ChartInteraction,
  type ChartInteractionItem,
  type ChartInteractionPoint,
} from '../_island/chart-interaction.client';
import { ChartFrame, chartFrameLabels } from '../chart-frame/chart-frame';
import type { ChartFrameLabels } from '../chart-frame/chart-frame.contract';
import { Legend, type ChartSeries } from '../legend/legend';

/** DonutChart's strings (§16.4), with ChartFrame's. Never concatenated: each is a whole label. */
export interface DonutChartLabels extends ChartFrameLabels {
  /** The data table's first column header. */
  category: string;
  /** The data table's value column. */
  value: string;
  /** The data table's share column. */
  share: string;
  /** The folded remainder. */
  other: string;
  /** Under the total in the centre. */
  total: string;
  /** After a slice's share in the card and in what the island speaks, for example "52% of total". */
  ofTotal: string;
  /** The interactive layer's role, as assistive technology names it. */
  interaction: string;
  /** The interactive layer's keyboard instructions. */
  hint: string;
  /** The interactive layer's name when `title` is not a string. */
  points: string;
}

/** English defaults (§16.4); pass `labels` to translate per instance. */
export const donutChartLabels: DonutChartLabels = {
  ...chartFrameLabels,
  category: 'Category',
  value: 'Value',
  share: 'Share',
  other: 'Other',
  total: 'Total',
  ofTotal: 'of total',
  interaction: 'interactive chart',
  hint: 'Arrow keys move between slices; Home and End go to the first and last',
  points: 'Chart slices',
};

export type DonutChartSort = 'value' | 'none';

/** One slice after folding. */
export interface DonutSlice {
  label: string;
  value: number;
  series: Exclude<ChartSeries, 'current' | 'previous'>;
}

const CATEGORICAL = ['cat-1', 'cat-2', 'cat-3'] as const;

/**
 * At most `max` (1–3) categories plus one "Other" slice (`otherLabel`), in a stable order: values
 * that are not finite or not above zero are dropped; `sort="value"` orders the rest largest first,
 * ties in input order; the first `max` keep chart/cat-1… and the remainder is summed into "Other",
 * which keeps its own label when it is one category.
 */
export function foldCategories(
  items: ReadonlyArray<{ label: string; value: number }>,
  max: number,
  otherLabel: string,
  sort: DonutChartSort = 'value',
): DonutSlice[] {
  const kept = items.filter((item) => Number.isFinite(item.value) && item.value > 0);
  if (sort === 'value') kept.sort((a, b) => b.value - a.value);
  const head = Math.min(Math.max(1, Math.floor(max)), CATEGORICAL.length);
  const out: DonutSlice[] = kept.slice(0, head).map((item, i) => ({
    label: item.label,
    value: item.value,
    series: CATEGORICAL[i] ?? 'cat-1',
  }));
  const rest = kept.slice(head);
  if (rest.length > 0) {
    out.push({
      label: rest.length === 1 ? (rest[0]?.label ?? otherLabel) : otherLabel,
      value: rest.reduce((sum, item) => sum + item.value, 0),
      series: 'other',
    });
  }
  return out;
}

const OUTER = 100;
const INNER = 74;
/** The middle of the ring, in percent of the plot from its centre (the card's anchor). */
const MID = (OUTER + INNER) / 4;
/** The gap between segments, in viewBox units (3 px on a 200 px ring). */
const GAP = 3;
const TAU = Math.PI * 2;
const PERCENT: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 0 };

const large = (span: number): number => (span > Math.PI ? 1 : 0);

function at(radius: number, angle: number): string {
  return `${num(radius * Math.sin(angle), 2)} ${num(-radius * Math.cos(angle), 2)}`;
}

/**
 * An annular sector from `a0` to `a1` (radians clockwise from 12 o'clock), trimmed by half the gap
 * at each end with parallel sides, flat ends. Empty when the segment is thinner than the gap. A
 * lone segment is the whole ring, with no gap.
 */
export function donutPath(a0: number, a1: number): string {
  if (a1 - a0 >= TAU - 1e-9) {
    return `M0 -${OUTER}A${OUTER} ${OUTER} 0 1 1 0 ${OUTER}A${OUTER} ${OUTER} 0 1 1 0 -${OUTER}M0 -${INNER}A${INNER} ${INNER} 0 1 0 0 ${INNER}A${INNER} ${INNER} 0 1 0 0 -${INNER}Z`;
  }
  const po = Math.asin(GAP / 2 / OUTER);
  const pi = Math.asin(GAP / 2 / INNER);
  if (a1 - a0 <= pi * 2) return '';
  return (
    `M${at(OUTER, a0 + po)}A${OUTER} ${OUTER} 0 ${large(a1 - a0 - po * 2)} 1 ${at(OUTER, a1 - po)}` +
    `L${at(INNER, a1 - pi)}A${INNER} ${INNER} 0 ${large(a1 - a0 - pi * 2)} 0 ${at(INNER, a0 + pi)}Z`
  );
}

/**
 * DonutChart's props: its data and formats in the charts' one shape (`_core/api.ts`) and ChartFrame's,
 * the `<figure>`'s attributes included. It draws no axes, its legend is its own, the ring is never
 * mirrored, and `interaction` (default `'nizivo'`) is the island's keyboard and pointer mode over the
 * slices or, with `'none'`, a static ring with CSS-only hover and no keyboard claim.
 */
export interface DonutChartProps<T> extends ChartFramePassthrough<
  'axes' | 'legend' | 'xDirection'
> {
  /** One datum per category, in any order (`sort` orders the slices). */
  data: readonly T[];
  /** The category's name: a key of the datum, or a `(datum, index)` function. */
  category: Accessor<T, string>;
  /** Its value; one that is not a finite number above zero is left out. */
  value: Accessor<T, number | null | undefined>;
  /** BCP 47 locale every number is formatted in, once, on the server (§16.4). @default 'en-US' */
  locale?: string;
  /** Values in the legend and the table. @default Intl.NumberFormat's own ({}) */
  format?: Intl.NumberFormatOptions;
  /** The total in the centre. @default `format` in compact notation with at most one fraction digit */
  totalFormat?: Intl.NumberFormatOptions;
  /** Shares. @default { style: 'percent', maximumFractionDigits: 0 } */
  shareFormat?: Intl.NumberFormatOptions;
  /** Categories kept before the rest fold into "Other", 1–3. @default 3 */
  maxCategories?: number;
  /** @default 'value' (largest first) */
  sort?: DonutChartSort;
  /** Replaces the centre (the total and its label); a hovered segment still shows its share. */
  center?: ReactNode;
  labels?: Partial<DonutChartLabels>;
}

export function DonutChart<T>({
  data,
  category,
  value,
  locale = 'en-US',
  format = INTL_DEFAULT,
  totalFormat,
  shareFormat = PERCENT,
  maxCategories = 3,
  sort,
  center,
  status = 'ready',
  labels,
  title,
  interaction = 'nizivo',
  className,
  ...frame
}: DonutChartProps<T>): ReactElement {
  const L: DonutChartLabels = { ...donutChartLabels, ...labels };
  const hintId = useId();
  const labelOf = accessor(category);
  const valueOf = accessor(value);
  const slices = foldCategories(
    // not finite → NaN, which the fold leaves out
    data.map((datum, i) => ({
      label: labelOf(datum, i),
      value: finite(valueOf(datum, i)) ?? Number.NaN,
    })),
    maxCategories,
    L.other,
    sort,
  );
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const number = new Intl.NumberFormat(locale, format);
  const share = new Intl.NumberFormat(locale, shareFormat);
  const rows = slices.map((slice) => ({
    ...slice,
    id: slice.series,
    value: number.format(slice.value),
    share: share.format(slice.value / total),
  }));

  // one pass: each slice's segment (an empty path for a sliver thinner than the gap, so the
  // island's n-th point is the n-th segment), its point (the card's title, value and share) and
  // its centre on the plot, in percent from the top left, half-way through the ring
  const segments: ReactElement[] = [];
  const points: ChartInteractionPoint[] = [];
  const items: ChartInteractionItem[] = [];
  for (let i = 0, start = 0; i < slices.length; i += 1) {
    const slice = slices[i];
    const row = rows[i];
    if (slice === undefined || row === undefined) continue;
    const end = start + (slice.value / total) * TAU;
    const middle = (start + end) / 2;
    segments.push(
      <path
        key={slice.series}
        className="nz-donut-chart-segment"
        data-series={slice.series}
        data-slot="donut-chart-segment"
        d={donutPath(start, end)}
      />,
    );
    points.push([row.label, [row.value], [], row.share]);
    items.push([
      Number(num(50 + MID * Math.sin(middle), 2)),
      Number(num(50 - MID * Math.cos(middle), 2)),
      slice.series,
    ]);
    start = end;
  }

  return (
    <ChartFrame
      {...frame}
      className={cx('nz-donut-chart', className)}
      title={title}
      labels={L}
      axes="none"
      interaction={interaction}
      table={{
        columns: [L.category, L.value, L.share],
        rows: rows.map((row) => [row.label, row.value, row.share]),
      }}
      status={status}
      legend={
        // in every status, so the box does not move (§16.5); the values only beside a drawn ring
        rows.length > 0 ? (
          <Legend
            orientation="vertical"
            items={
              status === 'ready'
                ? rows
                : rows.map(({ id, label, series }) => ({ id, label, series }))
            }
          />
        ) : null
      }
    >
      <svg className="nz-donut-chart-svg" viewBox="-100 -100 200 200" aria-hidden="true">
        <g className="nz-donut-chart-segments">{segments}</g>
      </svg>
      <div className="nz-donut-chart-center">
        {center ?? (
          <>
            <span className="nz-donut-chart-value">
              {new Intl.NumberFormat(locale, totalFormat ?? compactOf(format)).format(total)}
            </span>
            <span className="nz-donut-chart-label">{L.total}</span>
          </>
        )}
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className="nz-donut-chart-center"
          data-series={row.series}
          aria-hidden="true"
        >
          <span className="nz-donut-chart-value">{row.share}</span>
          <span className="nz-donut-chart-label">{row.label}</span>
        </div>
      ))}
      {interaction === 'nizivo' && (
        // item mode: the island roves over the segments (data-slot="donut-chart-segment") and
        // shows the card; it paints over the ring, so CSS :hover on a segment no longer fires
        <>
          <span id={hintId} className="nz-chart-visually-hidden">
            {L.hint}
          </span>
          <ChartInteraction
            series={[{ label: L.value, series: 'cat-1' }]}
            points={points}
            delta={L.ofTotal}
            separators={listSeparators(locale)}
            columns="donut-chart-segment"
            items={items}
            aria-label={typeof title === 'string' ? title : L.points}
            aria-roledescription={L.interaction}
            aria-describedby={hintId}
          />
        </>
      )}
    </ChartFrame>
  );
}

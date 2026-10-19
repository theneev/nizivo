// NO directive. The renderer seam of @nizivo/charts (ARCHITECTURE.md §14.1; seam ledger K9): what
// ChartFrame guarantees around ANY child, Nizivo's renderers or a third-party one (Recharts,
// ECharts, uPlot). Everything here serialises across the RSC boundary: the data the frame shows
// itself (table, ticks, labels) is pre-formatted strings, so a Server Component formats once.
import type { ReactNode } from 'react';

/**
 * The data lifecycle of every data-display part (§16.5). Declared structurally here because charts
 * imports nothing from @nizivo/react; it mirrors the `status` of KpiTile's contract (§10.7, §16.5),
 * which @nizivo/react 0.1.0 does not export yet. Keep the two identical.
 */
export type DataStatus = 'ready' | 'loading' | 'empty' | 'error';

/** The accessible alternative to the picture (§14.1, §16): pre-formatted strings only. */
export interface ChartTable {
  /** Column headers. `columns[0]` heads the row-header column (the x value or the category). */
  columns: readonly string[];
  /** One row per datum, `row[0]` its header (`<th scope="row">`), the rest its formatted values. */
  rows: ReadonlyArray<readonly string[]>;
}

/** `'frame'`: ChartFrame draws the HTML tick labels (`ticks`). `'none'`: the child draws its own. */
export type ChartAxes = 'frame' | 'none';

/**
 * `'nizivo'`: the child is a Nizivo renderer, whose ChartInteraction island gives keyboard access
 * to the points. `'none'`: a third-party child; the frame then makes no keyboard claim for the
 * points, but still guarantees the caption, the data table, the legend and the status.
 */
export type ChartInteractionMode = 'nizivo' | 'none';

/**
 * How the data table shows. `'hidden'`: visually hidden, read by assistive technology (no chrome,
 * as Figma 03 draws charts). `'details'`: a native `<details>` disclosure under the plot, so anyone
 * can open the values (zero JS).
 */
export type ChartTableView = 'hidden' | 'details';

/**
 * How x labels line up with the plot. `'point'`: one label per point of a point scale (lines and
 * areas): the first sits at the plot's start edge, the last at its end edge, both clamped inward
 * (Figma 03). `'band'`: one label centred in each band of a band scale (bars).
 */
export type ChartTickAlign = 'point' | 'band';

/** The direction of the x axis. Time and value axes do not mirror by default (§14.1, §16.4). */
export type ChartXDirection = 'ltr' | 'rtl' | 'auto';

/** HTML tick labels on CSS grid tracks: one track per position, so no label needs a position of its own. */
export interface ChartTicks {
  /** One label per x position, `''` where no tick falls (`tickLabels()` builds it). */
  x?: readonly string[];
  /** @default 'point' */
  xAlign?: ChartTickAlign;
  /**
   * Value labels from the top tick down to the baseline, evenly spaced: the ticks of a niced
   * domain (`valueDomain()`), whose first and last ticks are the plot's top and bottom edges.
   */
  y?: readonly string[];
}

/** ChartFrame's own strings (§16.4): serialisable, English defaults in `chartFrameLabels`. */
export interface ChartFrameLabels {
  /** Visually hidden text in the plot while `status="loading"` (§16.5: no live region). */
  loading: string;
  /** Shown in the plot when there is no data and no `empty` slot. */
  empty: string;
  /** Shown in the plot when loading failed and there is no `error` slot. */
  error: string;
  /** The summary of the `tableView="details"` disclosure. */
  table: string;
}

/** The props every renderer may rely on (§14.1). The component also takes `ChartFrameAttributes`. */
export interface ChartFrameProps {
  /** The figure's caption and its accessible name. */
  title: ReactNode;
  /** One line under the title, for example "Daily sales, Oct 1–30, vs previous period". */
  summary?: ReactNode;
  /** @default 'ready'; a ready chart with no table rows renders as `'empty'`. */
  status?: DataStatus;
  /** A refresh is in flight while the chart shows data (§16.5): `aria-busy` and `data-pending`. */
  pending?: boolean;
  table: ChartTable;
  /** @default 'hidden' */
  tableView?: ChartTableView;
  /** @default 'frame' */
  axes?: ChartAxes;
  ticks?: ChartTicks;
  /** @default 'nizivo' */
  interaction?: ChartInteractionMode;
  /** @default 'ltr' */
  xDirection?: ChartXDirection;
  /** A `<Legend>`, or any node; rendered between the caption and the plot in every status. */
  legend?: ReactNode;
  /** Replaces the default empty message. */
  empty?: ReactNode;
  /** Replaces the default error message, for example an InlineError with a retry action. */
  error?: ReactNode;
  labels?: Partial<ChartFrameLabels>;
  /** The renderer: an `<svg>` (or anything) that fills the plot. Rendered only while ready. */
  children?: ReactNode;
}

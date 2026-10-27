// NO directive: Heatmap renders its whole picture on the server, with no client JavaScript
// (ARCHITECTURE.md §14.1; Figma 03 "Heatmap", 751:393). A value per row and column (a day and an
// hour, say) as a grid of cells on Figma's ramp: chart/primary at five strengths, from "Fewer" to
// "More", with the scale under the grid. The grid is drawn for the eye and hidden from assistive
// technology, which reads the frame's data table instead: one row per row of the grid, one column
// per column, every value as text (Figma: "a table alternative is provided"; `tableView="details"`
// shows it to everyone). A cell's strength is a data attribute that CSS colours, never an inline
// style (CSP Profile B). It makes no keyboard claim: there is nothing to rove that the table does
// not already give.
import type { ReactElement } from 'react';
import {
  accessor,
  finite,
  INTL_DEFAULT,
  type Accessor,
  type ChartFramePassthrough,
  type ChartXTicks,
} from '../_core/api';
import { cx } from '../_shared/cx';
import { ChartFrame, chartFrameLabels } from '../chart-frame/chart-frame';
import type { ChartFrameLabels } from '../chart-frame/chart-frame.contract';

/** Heatmap's strings (§16.4), with ChartFrame's. Never concatenated: each is a whole label. */
export interface HeatmapLabels extends ChartFrameLabels {
  /** The data table's corner header, over the row names (for example "Day"). */
  row: string;
  /** In the table for a cell with no value. */
  missing: string;
  /** Before the scale's lightest swatch. */
  fewer: string;
  /** After its strongest swatch. */
  more: string;
}

/** English defaults (§16.4); pass `labels` to translate per instance. */
export const heatmapLabels: HeatmapLabels = {
  ...chartFrameLabels,
  row: 'Row',
  missing: '—',
  fewer: 'Fewer',
  more: 'More',
};

/** The ramp's steps: chart/primary at 8, 25, 45, 70 and 100 % (Figma). */
export const HEATMAP_STEPS: number = 5;

/**
 * A value's step on the ramp, 1 to 5, or `null` for no value: five equal widths over 0 to `max`.
 * 0 and below are step 1, `max` is step 5; with `max` at 0 or below every value is step 1.
 */
export function heatmapStep(value: number | null, max: number): number | null {
  if (value === null) return null;
  if (!(max > 0) || value <= 0) return 1;
  return Math.min(HEATMAP_STEPS, Math.max(1, Math.ceil((value / max) * HEATMAP_STEPS)));
}

/** The rows and columns in the order they first appear, and each cell's value. */
export function heatmapGrid(
  cells: ReadonlyArray<{ row: string; column: string; value: number | null }>,
): { rows: string[]; columns: string[]; values: Map<string, number | null>; max: number } {
  const rows: string[] = [];
  const columns: string[] = [];
  const values = new Map<string, number | null>();
  let max = 0;
  for (const cell of cells) {
    if (!rows.includes(cell.row)) rows.push(cell.row);
    if (!columns.includes(cell.column)) columns.push(cell.column);
    values.set(key(cell.row, cell.column), cell.value);
    if (cell.value !== null && cell.value > max) max = cell.value;
  }
  return { rows, columns, values, max };
}

const key = (row: string, column: string): string => `${row}\u0000${column}`;

/**
 * Heatmap's props: its data and formats in the charts' one shape (`_core/api.ts`) and ChartFrame's,
 * the `<figure>`'s attributes included. It draws its own labels and scale, is never mirrored and
 * makes no keyboard claim, so `axes`, `legend`, `xDirection` and `interaction` are its own.
 */
export interface HeatmapProps<T> extends ChartFramePassthrough<
  'axes' | 'legend' | 'xDirection' | 'interaction'
> {
  /** One datum per cell; rows and columns come in the order they first appear. */
  data: readonly T[];
  /** The cell's column (for example an hour): a key of the datum, or a `(datum, index)` function. */
  x: Accessor<T, string>;
  /** The cell's row (for example a day). */
  y: Accessor<T, string>;
  /** Its value; one that is not a finite number is a cell with no value. */
  value: Accessor<T, number | null | undefined>;
  /** BCP 47 locale every number is formatted in, once, on the server (§16.4). @default 'en-US' */
  locale?: string;
  /** Values in the data table. @default Intl.NumberFormat's own ({}) */
  format?: Intl.NumberFormatOptions;
  /** The column labels under the grid: `every` columns, or at most `max` labels. @default { max: 6 } */
  xTicks?: ChartXTicks;
  labels?: Partial<HeatmapLabels>;
}

const COLUMN_TICKS: ChartXTicks = { max: 6 };

export function Heatmap<T>({
  data,
  x,
  y,
  value,
  locale = 'en-US',
  format = INTL_DEFAULT,
  xTicks = COLUMN_TICKS,
  status = 'ready',
  labels,
  title,
  className,
  ...frame
}: HeatmapProps<T>): ReactElement {
  const L: HeatmapLabels = { ...heatmapLabels, ...labels };
  const columnOf = accessor(x);
  const rowOf = accessor(y);
  const valueOf = accessor(value);
  const grid = heatmapGrid(
    data.map((datum, i) => ({
      row: rowOf(datum, i),
      column: columnOf(datum, i),
      value: finite(valueOf(datum, i)),
    })),
  );
  const number = new Intl.NumberFormat(locale, format);
  const every = Math.max(
    1,
    Math.floor(xTicks.every ?? Math.ceil(grid.columns.length / Math.max(1, xTicks.max ?? 6))),
  );

  return (
    <ChartFrame
      {...frame}
      className={cx('nz-heatmap', className)}
      title={title}
      labels={L}
      axes="none"
      interaction="none"
      table={{
        columns: [L.row, ...grid.columns],
        rows: grid.rows.map((row) => [
          row,
          ...grid.columns.map((column) => {
            const v = grid.values.get(key(row, column)) ?? null;
            return v === null ? L.missing : number.format(v);
          }),
        ]),
      }}
      status={status}
    >
      <div className="nz-heatmap-grid" aria-hidden="true">
        {grid.rows.map((row) => (
          <div key={row} className="nz-heatmap-row">
            <span className="nz-heatmap-label">{row}</span>
            {grid.columns.map((column) => {
              const step = heatmapStep(grid.values.get(key(row, column)) ?? null, grid.max);
              return (
                <span
                  key={column}
                  className="nz-heatmap-cell"
                  data-slot="heatmap-cell"
                  data-step={step ?? undefined}
                />
              );
            })}
          </div>
        ))}
        <div className="nz-heatmap-row nz-heatmap-columns">
          <span className="nz-heatmap-label" />
          {grid.columns.map((column, i) => (
            <span key={column} className="nz-heatmap-column">
              {i % every === 0 ? column : ''}
            </span>
          ))}
        </div>
        <div className="nz-heatmap-scale" data-slot="heatmap-scale">
          <span>{L.fewer}</span>
          {[1, 2, 3, 4, 5].map((step) => (
            <span key={step} className="nz-heatmap-swatch" data-step={step} />
          ))}
          <span>{L.more}</span>
        </div>
      </div>
    </ChartFrame>
  );
}

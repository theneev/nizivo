// NO directive: ChartFrame renders on the server (ARCHITECTURE.md §14.1). It owns what every chart
// needs whatever draws it: the <figure> and its caption, the legend slot, the status contract
// (§16.5), the HTML tick labels on CSS grid tracks, and the server-rendered data table, the
// accessible alternative to the picture (§16). The plot is the child: a Nizivo renderer or any
// third-party one (chart-frame.contract.ts).
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { cx } from '../_shared/cx';
import { renderElement, type RenderProp } from '../_shared/render';
import type {
  ChartFrameLabels,
  ChartFrameProps,
  ChartInteractionMode,
  ChartTable,
  ChartTicks,
  DataStatus,
} from './chart-frame.contract';

/** English defaults of ChartFrame's strings (§16.4); pass `labels` to translate per instance. */
export const chartFrameLabels: ChartFrameLabels = {
  loading: 'Loading chart',
  empty: 'No data to show',
  error: 'This chart could not be loaded',
  table: 'Show data table',
};

/** What a `render` function receives. */
export interface ChartFrameState {
  /** The status as rendered: `'empty'` when a ready chart has no rows. */
  status: DataStatus;
  pending: boolean;
  /** As passed: whether the child claims keyboard access to its points. */
  interaction: ChartInteractionMode;
}

/** ChartFrame's HTML side: the `<figure>`'s attributes and the `render` prop. */
export interface ChartFrameAttributes extends Omit<
  ComponentPropsWithRef<'figure'>,
  'title' | 'children'
> {
  render?: RenderProp<ChartFrameState>;
}

export type ChartFrameElementProps = ChartFrameProps & ChartFrameAttributes;

const present = (on: boolean): '' | undefined => (on ? '' : undefined);

export function ChartFrame({
  title,
  summary,
  titleVisibility = 'visible',
  status = 'ready',
  pending = false,
  table,
  tableView = 'hidden',
  axes = 'frame',
  ticks,
  interaction = 'nizivo',
  xDirection = 'ltr',
  legend,
  empty,
  error,
  labels,
  children,
  render,
  className,
  ...rest
}: ChartFrameElementProps): ReactElement {
  const L: ChartFrameLabels = { ...chartFrameLabels, ...labels };
  const titleId = useId();
  const st: DataStatus = status === 'ready' && table.rows.length === 0 ? 'empty' : status;
  const ready = st === 'ready';
  const busy = st === 'loading' || (ready && pending);

  let plot: ReactNode;
  if (st === 'loading') {
    plot = (
      <>
        <span
          className="nz-chart-frame-skeleton"
          data-slot="chart-frame-skeleton"
          aria-hidden="true"
        />
        <span className="nz-chart-visually-hidden">{L.loading}</span>
      </>
    );
  } else if (st === 'error') {
    plot = error ?? <p className="nz-chart-frame-message">{L.error}</p>;
  } else if (st === 'empty') {
    plot = empty ?? <p className="nz-chart-frame-message">{L.empty}</p>;
  } else {
    plot = children;
  }

  return renderElement(
    'figure',
    render,
    { status: st, pending: ready && pending, interaction },
    {
      'data-slot': 'chart-frame',
      ...rest,
      className: cx('nz-chart-frame', className),
      'data-x-direction': xDirection,
      'data-loading': present(st === 'loading'),
      'data-empty': present(st === 'empty'),
      'data-error': present(st === 'error'),
      'data-pending': present(ready && pending),
      'aria-busy': busy || undefined,
      children: (
        <>
          {/* titleVisibility="hidden": visually hidden, never display: none, so the figcaption
              still names the figure (and the title the table) */}
          <figcaption
            className={cx(
              'nz-chart-frame-caption',
              titleVisibility === 'hidden' && 'nz-chart-visually-hidden',
            )}
            data-slot="chart-frame-caption"
          >
            <span className="nz-chart-frame-title" id={titleId}>
              {title}
            </span>
            {summary != null && <span className="nz-chart-frame-summary">{summary}</span>}
          </figcaption>
          {legend != null && (
            <div className="nz-chart-frame-legend" data-slot="chart-frame-legend">
              {legend}
            </div>
          )}
          <div className="nz-chart-frame-body" data-slot="chart-frame-body">
            {axes === 'frame' && <YTicks labels={ready ? ticks?.y : undefined} />}
            <div className="nz-chart-frame-plot" data-slot="chart-frame-plot">
              {plot}
            </div>
            {axes === 'frame' && (
              <XTicks labels={ready ? ticks?.x : undefined} align={ticks?.xAlign ?? 'point'} />
            )}
          </div>
          {tableView === 'details' ? (
            <TableDetails ready={ready} table={table} titleId={titleId} summary={L.table} />
          ) : (
            // The wrapper, not the table, is visually hidden: a <table> ignores `inline-size: 1px`
            // and keeps its full layout box, which can add horizontal scroll on a narrow page.
            ready && (
              <div className="nz-chart-visually-hidden">
                <DataTable table={table} titleId={titleId} />
              </div>
            )
          )}
        </>
      ),
    },
  );
}

/** The y labels: k labels on k − 1 equal rows, each label centred on a row edge. */
function YTicks({ labels }: { labels: readonly string[] | undefined }): ReactElement {
  return (
    <div className="nz-chart-frame-y-ticks" data-slot="chart-frame-y-ticks" aria-hidden="true">
      {edgeCells(labels ?? [])}
    </div>
  );
}

function XTicks({
  labels,
  align,
}: {
  labels: readonly string[] | undefined;
  align: NonNullable<ChartTicks['xAlign']>;
}): ReactElement {
  const list = labels ?? [];
  return (
    <div
      className={cx('nz-chart-frame-x-ticks', align === 'band' && 'nz-chart-frame-x-ticks-band')}
      data-slot="chart-frame-x-ticks"
      aria-hidden="true"
    >
      {align === 'band' || list.length < 2
        ? list.map((label, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- a track's position is its identity
            <span key={i} className="nz-chart-frame-cell">
              <span className="nz-chart-frame-tick">{label}</span>
            </span>
          ))
        : edgeCells(list)}
    </div>
  );
}

/**
 * Point-aligned labels without a position of their own: n labels sit on the n edges of n − 1 equal
 * tracks. Cell i holds label i at its start edge (nothing when it is `''`); the last cell also holds
 * the last label at its end edge. Each tick is a zero-size flex box whose text overflows evenly around the edge, and CSS
 * clamps the first and last inward (Figma 03), in either direction.
 */
function edgeCells(labels: readonly string[]): ReactElement[] {
  const cells: ReactElement[] = [];
  for (let i = 0; i < labels.length - 1; i += 1) {
    const last = i === labels.length - 2;
    // a track with no label is an empty cell (a long daily series has hundreds), except the last,
    // whose end-edge label needs the start one to sit opposite it
    cells.push(
      <span key={i} className="nz-chart-frame-cell">
        {(last || labels[i] !== '') && <span className="nz-chart-frame-tick">{labels[i]}</span>}
        {last && <span className="nz-chart-frame-tick">{labels[i + 1]}</span>}
      </span>,
    );
  }
  return cells;
}

function DataTable({ table, titleId }: { table: ChartTable; titleId: string }): ReactElement {
  const [head, ...values] = table.columns;
  return (
    <table className="nz-chart-frame-table" data-slot="chart-frame-table" aria-labelledby={titleId}>
      <thead>
        <tr>
          <th scope="col">{head}</th>
          {values.map((column, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- a column's position is its identity
            <th key={i} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map(([header, ...cells], r) => (
          // oxlint-disable-next-line react/no-array-index-key -- rows are positional (static markup)
          <tr key={r}>
            <th scope="row">{header}</th>
            {cells.map((cell, c) => (
              // oxlint-disable-next-line react/no-array-index-key -- a cell's position is its identity
              <td key={c}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * `tableView="details"`: a native disclosure, zero JS. It renders in every status so the frame's box
 * is the same in all four (§16.5); until the chart is ready it is an inert, dimmed summary line.
 */
function TableDetails({
  ready,
  table,
  titleId,
  summary,
}: {
  ready: boolean;
  table: ChartTable;
  titleId: string;
  summary: string;
}): ReactElement {
  if (!ready) {
    return (
      <div className="nz-chart-frame-details" data-slot="chart-frame-details" data-disabled="">
        <span className="nz-chart-frame-details-summary" aria-hidden="true">
          {summary}
        </span>
      </div>
    );
  }
  return (
    <details className="nz-chart-frame-details" data-slot="chart-frame-details">
      <summary className="nz-chart-frame-details-summary">{summary}</summary>
      <div className="nz-chart-frame-table-scroll">
        <DataTable table={table} titleId={titleId} />
      </div>
    </details>
  );
}

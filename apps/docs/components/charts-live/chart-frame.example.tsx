// Copied from packages/charts/src/chart-frame/chart-frame.example.tsx, imports made public; do not edit.
// components/chart-example.tsx checks at build time that it still equals the package file.
import type { JSX } from 'react';
import { Legend } from '@nizivo/charts/legend';
import { ChartFrame, type ChartTable } from '@nizivo/charts/chart-frame';

// A week of daily sales, already formatted, as a Server Component would pass it.
const TABLE: ChartTable = {
  columns: ['Day', 'This period', 'Previous'],
  rows: [
    ['Oct 1', '$2,140', '$1,980'],
    ['Oct 2', '$3,020', '$2,210'],
    ['Oct 3', '$2,760', '$2,450'],
    ['Oct 4', '$4,310', '$2,900'],
    ['Oct 5', '$3,880', '$3,120'],
    ['Oct 6', '$5,240', '$3,060'],
    ['Oct 7', '$6,280', '$3,410'],
  ],
};
const X = ['Oct 1', '', '', 'Oct 4', '', '', 'Oct 7'];
const Y = ['$8k', '$6k', '$4k', '$2k', '$0'];

/** Stands in for a renderer: a percent-space SVG, as AreaChart draws it (viewBox 0 0 100 100). */
function Plot(): JSX.Element {
  return (
    <svg
      className="nz-chart-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[0, 25, 50, 75].map((y) => (
        <line key={y} className="nz-chart-grid" x1="0" x2="100" y1={y} y2={y} />
      ))}
      <line className="nz-chart-baseline" x1="0" x2="100" y1="100" y2="100" />
      <path
        className="nz-chart-area"
        data-series="current"
        d="M0,73.25L16.667,62.25L33.333,65.5L50,46.125L66.667,51.5L83.333,34.5L100,21.5V100H0Z"
      />
      <path
        className="nz-chart-line"
        data-series="previous"
        d="M0,75.25L16.667,72.375L33.333,69.375L50,63.75L66.667,61L83.333,61.75L100,57.375"
      />
      <path
        className="nz-chart-line"
        data-series="current"
        d="M0,73.25L16.667,62.25L33.333,65.5L50,46.125L66.667,51.5L83.333,34.5L100,21.5"
      />
    </svg>
  );
}

const LEGEND = (
  <Legend
    items={[
      { label: 'This period', series: 'current' },
      { label: 'Previous', series: 'previous' },
    ]}
  />
);

export function ChartFrameExample(): JSX.Element {
  return (
    <ChartFrame
      title="Sales"
      summary="Daily sales, Oct 1–7, vs previous period"
      table={TABLE}
      ticks={{ x: X, y: Y }}
      legend={LEGEND}
    >
      <Plot />
    </ChartFrame>
  );
}

/** The data table as a native disclosure under the plot (zero JS). */
export function ChartFrameDetailsExample(): JSX.Element {
  return (
    <ChartFrame title="Sales" table={TABLE} ticks={{ x: X, y: Y }} tableView="details">
      <Plot />
    </ChartFrame>
  );
}

/** Loading, empty and error keep the frame's box (§16.5). */
export function ChartFrameStatusExample(): JSX.Element {
  return (
    <div>
      <ChartFrame title="Sales" status="loading" table={TABLE} legend={LEGEND} />
      <ChartFrame title="Sales" status="empty" table={TABLE} legend={LEGEND} />
      <ChartFrame title="Sales" status="error" table={TABLE} legend={LEGEND} />
    </div>
  );
}

/**
 * A third-party renderer (any `<svg>`): the caller passes `table` and `interaction="none"`, and the
 * frame still gives the caption, the data table, the legend and the status (§14.1).
 */
export function ChartFrameThirdPartyExample(): JSX.Element {
  return (
    <ChartFrame
      title="Orders"
      table={{
        columns: ['Channel', 'Orders'],
        rows: [
          ['Online', '412'],
          ['Retail', '268'],
        ],
      }}
      axes="none"
      interaction="none"
    >
      <svg viewBox="0 0 200 80" width="100%" height="100%" role="presentation">
        <rect x="10" y="10" width="120" height="24" fill="#1a573a" />
        <rect x="10" y="46" width="78" height="24" fill="#6b8a1e" />
      </svg>
    </ChartFrame>
  );
}

import type { JSX } from 'react';
import { KpiTile } from './index';

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

/**
 * A stand-in for `<Sparkline data={series} label="…" />` from @nizivo/charts, which @nizivo/react
 * never imports: any element fits the `chart` slot.
 */
function Shape({ d }: { d: string }): JSX.Element {
  return (
    <svg viewBox="0 0 88 28" width="88" height="28" aria-hidden="true" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const UP = 'M1 22 L12 19 L23 21 L34 15 L45 17 L56 11 L67 12 L78 6 L87 4';
const DOWN = 'M1 6 L12 9 L23 7 L34 13 L45 11 L56 16 L67 15 L78 21 L87 23';

/** Figma's four variants: the tint groups a row and no longer follows the trend. */
export function KpiTileExample(): JSX.Element {
  return (
    <div>
      <KpiTile
        label="Total sales"
        value={48290}
        format={USD}
        delta={0.124}
        comparison="vs last week"
        chart={<Shape d={UP} />}
      />
      <KpiTile
        label="Conversion"
        value={0.032}
        format={{ style: 'percent', maximumFractionDigits: 1 }}
        delta={-0.031}
        comparison="vs last week"
        chart={<Shape d={DOWN} />}
      />
      <KpiTile
        tone="brand"
        label="Orders"
        value={1284}
        delta={0.124}
        comparison="vs last week"
        chart={<Shape d={UP} />}
      />
      <KpiTile
        tone="accent"
        label="Returning rate"
        value={0.284}
        format={{ style: 'percent', maximumFractionDigits: 1 }}
        delta={-0.031}
        comparison="vs last week"
        chart={<Shape d={DOWN} />}
      />
    </div>
  );
}

/** The four statuses (§16.5). The loading tile is also the Suspense fallback; the box is the same. */
export function KpiTileStatesExample(): JSX.Element {
  return (
    <div>
      <KpiTile label="Total sales" status="loading" />
      <KpiTile label="Total sales" value={null} />
      <KpiTile label="Total sales" status="error" />
      <KpiTile label="Total sales" value={48290} format={USD} delta={0.124} pending />
    </div>
  );
}

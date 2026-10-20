import type { JSX } from 'react';
import { Delta } from '../delta/index';
import { Metric } from './index';

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

export function MetricExample(): JSX.Element {
  return (
    <div>
      <Metric
        label="Total sales"
        value={48290}
        format={USD}
        delta={0.124}
        comparison="vs last week"
      />
      {/* A rise in refunds is bad news: pass your own Delta for the tone */}
      <Metric
        label="Refunds"
        value={1290}
        format={USD}
        delta={<Delta value={0.08} tone="critical" />}
        comparison="vs last month"
      />
      <Metric
        size="display"
        label="Total sales"
        value={123307.4}
        format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
        delta={0.182}
      />
    </div>
  );
}

/** The four statuses (§16.5): the same box in each. */
export function MetricStatesExample(): JSX.Element {
  return (
    <div>
      <Metric label="Orders" status="loading" comparison="vs last week" />
      <Metric label="Orders" value={null} comparison="vs last week" />
      <Metric label="Orders" status="error" comparison="vs last week" />
      <Metric label="Orders" value={1284} delta={-0.031} comparison="vs last week" pending />
    </div>
  );
}

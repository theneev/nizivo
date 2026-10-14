import type { JSX } from 'react';
import { Delta } from './index';

export function DeltaExample(): JSX.Element {
  return (
    <div>
      <Delta value={0.124} comparison="vs last week" />
      <Delta value={-0.031} comparison="vs last week" />
      <Delta value={0} comparison="vs last week" />
      {/* A rise in refunds is bad news */}
      <Delta value={0.08} tone="critical" comparison="refunds vs last month" />
      <Delta value={1250} format={{ style: 'currency', currency: 'EUR' }} locale="de-DE" />
    </div>
  );
}

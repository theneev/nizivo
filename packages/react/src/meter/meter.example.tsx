import type { JSX } from 'react';
import { Meter } from './index';

export function MeterExample(): JSX.Element {
  return (
    <div>
      {/* usage: high is bad, so the optimum is the minimum */}
      <Meter label="Plan storage" value={86} high={80} optimum={0} />
      {/* stock: low is bad, so the optimum is the maximum */}
      <Meter label="Low stock" value={12} low={20} high={50} optimum={100} />
      <Meter label="Used" value={310} max={500} valueText="310 / 500" />
    </div>
  );
}

// FunnelChart against the chart conformance suite (chart.conformance.tsx): a Nizivo renderer that
// makes no keyboard claim (`interaction: 'none'`): every value is text in its rows, which are hidden
// from assistive technology, and the frame's data table carries step, count and share.
import { FunnelChart } from '../../src/funnel-chart/index';
import { chartConformance } from './chart.conformance';

const DATA = [
  { name: 'Sessions', sessions: 48210 },
  { name: 'Added to cart', sessions: 9642 },
  { name: 'Reached checkout', sessions: 4628 },
  { name: 'Purchased', sessions: 2914 },
];

chartConformance({
  part: 'funnel-chart',
  interaction: 'none',
  render: (frame) => (
    <FunnelChart title="Checkout funnel" data={DATA} step="name" value="sessions" {...frame} />
  ),
});

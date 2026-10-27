// Heatmap against the chart conformance suite (chart.conformance.tsx): a Nizivo renderer that makes
// no keyboard claim (`interaction: 'none'`): the grid is hidden from assistive technology and the
// frame's data table holds every value, one row per row of the grid.
import { Heatmap } from '../../src/heatmap/index';
import { chartConformance } from './chart.conformance';

const DATA = ['Mon', 'Tue', 'Wed'].flatMap((day, d) =>
  ['00', '06', '12', '18'].map((hour, h) => ({ day, hour, orders: (d + 1) * (h + 2) })),
);

chartConformance({
  part: 'heatmap',
  interaction: 'none',
  render: (frame) => (
    <Heatmap title="Orders by hour" data={DATA} x="hour" y="day" value="orders" {...frame} />
  ),
});

// BarChart against the chart conformance suite (chart.conformance.tsx). It makes no keyboard claim
// (`interaction: 'none'`): hover is CSS only and the data table is the keyboard path, until the
// ChartInteraction island drives its bands.
import { BarChart } from '../../src/bar-chart/index';
import { chartConformance } from './chart.conformance';

const DATA = [
  { day: '2026-10-14', orders: 213 },
  { day: '2026-10-15', orders: -12 },
  { day: '2026-10-16', orders: 310 },
];

chartConformance({
  part: 'bar-chart',
  interaction: 'none',
  render: (frame) => (
    <BarChart title="Orders" data={DATA} x={(d) => d.day} y={(d) => d.orders} {...frame} />
  ),
});

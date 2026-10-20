// BarChart against the chart conformance suite (chart.conformance.tsx): a Nizivo renderer that
// claims the keyboard (`interaction: 'nizivo'`, M40 item 2): the ChartInteraction island's column
// mode is in the server markup while ready, one named tab stop over the bands and one polite live
// region. With interaction="none" it is a static chart (CSS-only hover) and claims nothing.
import { BarChart } from '../../src/bar-chart/index';
import { chartConformance } from './chart.conformance';

const DATA = [
  { day: '2026-10-14', orders: 213 },
  { day: '2026-10-15', orders: -12 },
  { day: '2026-10-16', orders: 310 },
];

chartConformance({
  part: 'bar-chart',
  interaction: 'nizivo',
  render: (frame) => <BarChart title="Orders" data={DATA} x="day" y="orders" {...frame} />,
});

chartConformance({
  part: 'bar-chart (static)',
  interaction: 'none',
  render: (frame) => (
    <BarChart title="Orders" data={DATA} x="day" y="orders" interaction="none" {...frame} />
  ),
});

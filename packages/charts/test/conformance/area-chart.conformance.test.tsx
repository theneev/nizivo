// AreaChart against the chart conformance suite (chart.conformance.tsx): a Nizivo renderer, so it
// claims the keyboard (`interaction: 'nizivo'`): its ChartInteraction island is in the server
// markup while ready, one named tab stop and one polite live region. With interaction="none" it is
// a static chart and claims nothing.
import { AreaChart } from '../../src/area-chart/index';
import { chartConformance } from './chart.conformance';

const DATA = [
  { date: '2026-10-14', current: 6284, previous: 4910 },
  { date: '2026-10-15', current: 3980, previous: 4620 },
  { date: '2026-10-16', current: 5120, previous: null },
];

chartConformance({
  part: 'area-chart',
  interaction: 'nizivo',
  render: (frame) => (
    <AreaChart title="Sales" data={DATA} x="date" y="current" compare="previous" {...frame} />
  ),
});

chartConformance({
  part: 'area-chart (static)',
  interaction: 'none',
  render: (frame) => (
    <AreaChart title="Sales" data={DATA} x="date" y="current" interaction="none" {...frame} />
  ),
});

// DonutChart against the chart conformance suite (chart.conformance.tsx): a Nizivo renderer that
// claims the keyboard (`interaction: 'nizivo'`, M41 item 2): the ChartInteraction island's item mode
// is in the server markup while ready, one named tab stop over the ring and one polite live region.
// With interaction="none" it is a static ring (CSS-only hover) and claims nothing; the legend (every
// value and share) and the data table carry the same information without a pointer in both.
import { DonutChart } from '../../src/donut-chart/index';
import { chartConformance } from './chart.conformance';

const DATA = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
  { name: 'Marketplace', sales: 5210 },
  { name: 'Pop-up', sales: 2188 },
];

chartConformance({
  part: 'donut-chart',
  interaction: 'nizivo',
  render: (frame) => (
    <DonutChart title="Sales by channel" data={DATA} category="name" value="sales" {...frame} />
  ),
});

chartConformance({
  part: 'donut-chart (static)',
  interaction: 'none',
  render: (frame) => (
    <DonutChart
      title="Sales by channel"
      data={DATA}
      category="name"
      value="sales"
      interaction="none"
      {...frame}
    />
  ),
});

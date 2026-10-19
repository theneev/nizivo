// DonutChart against the chart conformance suite (chart.conformance.tsx). It makes no keyboard claim
// (`interaction: 'none'`): hover is CSS only, and the legend (every value and share) and the data
// table carry the same information without a pointer.
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
  interaction: 'none',
  render: (frame) => (
    <DonutChart
      title="Sales by channel"
      data={DATA}
      category={(d) => d.name}
      value={(d) => d.sales}
      {...frame}
    />
  ),
});

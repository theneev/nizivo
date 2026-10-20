// v0.2 (ARCHITECTURE.md §14.1, §10.8): an AreaChart with a comparison series, rendered by a Server
// Component. The server HTML carries the whole SVG, the data table and the legend; the only client
// module is the ChartInteraction island, which receives pre-formatted strings.
import '@nizivo/charts/styles.css';
// The barrel on purpose, now that `./area-chart` is exported (M40): it checks that the barrel
// tree-shakes to AreaChart.
import { AreaChart } from '@nizivo/charts';
import { SALES, USD } from './data.js';

export default function Page() {
  return (
    <main>
      <h1>AreaChart on the server</h1>
      <AreaChart
        title="Sales"
        summary="Daily sales, Oct 1–14, vs previous period"
        data={SALES}
        x="date"
        y="sales"
        compare="previous"
        format={USD}
      />
    </main>
  );
}

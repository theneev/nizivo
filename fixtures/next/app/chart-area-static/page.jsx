// The same AreaChart with interaction="none": no client code runs. area-chart.tsx imports the
// island statically, so a bundler that ships imported client modules may still ship it (see
// RESULTS.md, "imported, not rendered"); the spec allows that and requires nothing.
import '@nizivo/charts/styles.css';
// The barrel: `./area-chart` is not exported this week (its size against §17.2 is open; W10-RESULTS.md).
import { AreaChart } from '@nizivo/charts';
import { SALES, USD } from '../chart-area/data.js';

export default function Page() {
  return (
    <main>
      <h1>AreaChart with no interaction</h1>
      <AreaChart
        title="Sales"
        summary="Daily sales, Oct 1–14"
        data={SALES}
        x="date"
        y="sales"
        format={USD}
        interaction="none"
      />
    </main>
  );
}

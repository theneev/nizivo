// K9 (ARCHITECTURE.md §14.1): a third-party-style client renderer inside the server ChartFrame with
// interaction="none". The frame keeps the caption, the data table, the legend and the status; it
// makes no keyboard claim, and no @nizivo/charts client module ships (chart-frame and legend have
// none). The caller supplies the table, pre-formatted.
import '@nizivo/charts/styles.css';
import { ChartFrame } from '@nizivo/charts/chart-frame';
import { Legend } from '@nizivo/charts/legend';
import { SALES } from '../chart-area/data.js';
import { ThirdPartyPlot } from './plot.client.jsx';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function Page() {
  return (
    <main>
      <h1>A third-party renderer in ChartFrame</h1>
      <ChartFrame
        title="Sales"
        summary="Daily sales, Oct 1–14"
        interaction="none"
        axes="none"
        table={{
          columns: ['Day', 'Sales'],
          rows: SALES.map((d) => [
            day.format(new Date(`${d.date}T00:00:00Z`)),
            usd.format(d.sales),
          ]),
        }}
        legend={<Legend items={[{ label: 'This period', series: 'current' }]} />}
      >
        <ThirdPartyPlot points={SALES.map((d) => d.sales)} />
      </ChartFrame>
    </main>
  );
}

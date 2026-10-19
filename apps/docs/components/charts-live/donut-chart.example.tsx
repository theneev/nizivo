// Copied from packages/charts/src/donut-chart/donut-chart.example.tsx, imports made public; do not edit.
// components/chart-example.tsx checks at build time that it still equals the package file.
import type { JSX } from 'react';
import { DonutChart } from '@nizivo/charts/donut-chart';

interface Channel {
  name: string;
  sales: number;
}

// Figma 03's donut: sales by channel. Five channels fold into three plus "Other" ($7,398).
const CHANNELS: Channel[] = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
  { name: 'Marketplace', sales: 5210 },
  { name: 'Pop-up', sales: 2188 },
];

const USD: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
};

export function DonutChartExample(): JSX.Element {
  return (
    <DonutChart
      title="Sales by channel"
      summary="Share of total sales, October"
      data={CHANNELS}
      category={(d) => d.name}
      value={(d) => d.sales}
      format={USD}
      labels={{ category: 'Channel', value: 'Sales', total: 'Total sales' }}
    />
  );
}

/** Two categories: nothing folds; formatted for Germany, with a custom centre. */
export function DonutChartLocaleExample(): JSX.Element {
  return (
    <DonutChart
      title="Zahlungsarten"
      data={[
        { name: 'Karte', sales: 81250.5 },
        { name: 'Rechnung', sales: 19800 },
      ]}
      category={(d) => d.name}
      value={(d) => d.sales}
      locale="de-DE"
      format={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }}
      center={<span className="nz-donut-chart-value">2 Arten</span>}
      labels={{ category: 'Zahlungsart', value: 'Umsatz', share: 'Anteil', other: 'Andere' }}
    />
  );
}

/** Loading, empty and error keep the ring's square (§16.5). */
export function DonutChartStatusExample(): JSX.Element {
  return (
    <div>
      <DonutChart
        title="Sales by channel"
        status="loading"
        data={[]}
        category={(d: Channel) => d.name}
        value={(d) => d.sales}
      />
      <DonutChart
        title="Sales by channel"
        data={[]}
        category={(d: Channel) => d.name}
        value={(d) => d.sales}
      />
      <DonutChart
        title="Sales by channel"
        status="error"
        data={CHANNELS}
        category={(d) => d.name}
        value={(d) => d.sales}
      />
    </div>
  );
}

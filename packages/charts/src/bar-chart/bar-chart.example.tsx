import type { JSX } from 'react';
import { BarChart } from './index';

interface Day {
  date: string;
  orders: number;
}

// Figma 03's bar chart: orders per day, Oct 17–30. The last bar (313) is above Figma's top tick
// (300); here the domain is niced first, so the axis ends at 400.
const ORDERS: Day[] = [183, 214, 196, 241, 269, 232, 205, 228, 251, 279, 263, 299, 287, 313].map(
  (orders, i) => ({ date: `2026-10-${String(17 + i)}`, orders }),
);

export function BarChartExample(): JSX.Element {
  return (
    <BarChart
      title="Orders"
      summary="Orders per day, Oct 17–30"
      data={ORDERS}
      x={(d) => d.date}
      y={(d) => d.orders}
      dateFormat={{ day: 'numeric' }}
      labels={{ category: 'Day', value: 'Orders' }}
    />
  );
}

interface Month {
  month: string;
  net: number;
}

const NET: Month[] = [
  { month: 'Jan', net: 4200 },
  { month: 'Feb', net: 2600 },
  { month: 'Mar', net: -1800 },
  { month: 'Apr', net: 3100 },
  { month: 'May', net: -900 },
  { month: 'Jun', net: 5400 },
];

/** Negative values hang from the zero baseline, rounded at their data end too; values in euros. */
export function BarChartNegativeExample(): JSX.Element {
  return (
    <BarChart
      title="Net revenue"
      summary="Change per month, first half"
      data={NET}
      x={(d) => d.month}
      y={(d) => d.net}
      locale="de-DE"
      format={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }}
      labels={{ category: 'Monat', value: 'Netto' }}
      tableView="details"
    />
  );
}

/** Loading, empty and error keep the frame's box (§16.5). */
export function BarChartStatusExample(): JSX.Element {
  return (
    <div>
      <BarChart
        title="Orders"
        status="loading"
        data={[]}
        x={(d: Day) => d.date}
        y={(d) => d.orders}
      />
      <BarChart title="Orders" data={[]} x={(d: Day) => d.date} y={(d) => d.orders} />
      <BarChart title="Orders" status="error" data={ORDERS} x={(d) => d.date} y={(d) => d.orders} />
    </div>
  );
}

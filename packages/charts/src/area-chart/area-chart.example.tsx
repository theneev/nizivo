import type { JSX } from 'react';
import { AreaChart } from './index';

interface Day {
  date: string;
  current: number;
  previous: number;
}

// Thirty days of sales (Oct 1–30, this period vs the previous one).
// Deterministic, so the visual lane's shots are stable.
const DAYS: Day[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  current: Math.round(2200 + i * 150 + Math.sin(i / 2.2) * 620 + (i % 4) * 90),
  previous: Math.round(2600 + i * 55 + Math.cos(i / 3) * 380),
}));

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

export function AreaChartExample(): JSX.Element {
  return (
    <AreaChart
      title="Sales"
      summary="Daily sales, Oct 1–30, vs previous period"
      data={DAYS}
      x="date"
      y="current"
      compare="previous"
      format={USD}
    />
  );
}

/** One series, no comparison: no legend, no delta. */
export function AreaChartSingleExample(): JSX.Element {
  return (
    <AreaChart
      title="Orders"
      data={DAYS.slice(0, 14)}
      x="date"
      y={(day) => Math.round(day.current / 42)}
    />
  );
}

/** The data table as a native disclosure under the plot, and no keyboard layer (zero JS). */
export function AreaChartStaticExample(): JSX.Element {
  return (
    <AreaChart
      title="Sales"
      data={DAYS}
      x="date"
      y="current"
      format={USD}
      interaction="none"
      tableView="details"
    />
  );
}

/** Loading, empty and error keep the chart's box (§16.5). */
export function AreaChartStatusExample(): JSX.Element {
  return (
    <div>
      <AreaChart title="Sales" status="loading" data={DAYS} x="date" y="current" />
      <AreaChart title="Sales" data={[] as Day[]} x="date" y="current" />
      <AreaChart title="Sales" status="error" data={DAYS} x="date" y="current" />
    </div>
  );
}

/** Time mirrored for a right-to-left page that wants it (xDirection="rtl"; the default keeps ltr). */
export function AreaChartRtlExample(): JSX.Element {
  return (
    <div dir="rtl">
      <AreaChart
        title="المبيعات"
        data={DAYS}
        x="date"
        y="current"
        compare="previous"
        locale="ar-EG"
        format={{ maximumFractionDigits: 0 }}
        axisFormat={{ maximumFractionDigits: 0 }}
        xDirection="rtl"
        labels={{ current: 'هذه الفترة', previous: 'الفترة السابقة', delta: 'مقارنة بالسابقة' }}
      />
    </div>
  );
}

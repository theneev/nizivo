import type { JSX } from 'react';
import { Download } from '@nizivo/icons';
import { AreaChart } from '@nizivo/charts/area-chart';
import { BarChart } from '@nizivo/charts/bar-chart';
import { DonutChart } from '@nizivo/charts/donut-chart';
import { Legend } from '@nizivo/charts/legend';
import { Sparkline } from '@nizivo/charts/sparkline';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { KpiTile } from '@nizivo/react/kpi-tile';
import { PageHeader } from '@nizivo/react/page-header';
import { ProgressRing } from '@nizivo/react/progress-ring';
import { RankedList } from '@nizivo/react/ranked-list';
import { SegmentedControl } from '@nizivo/react/segmented-control';
import { Text } from '@nizivo/react/text';
import { TrendCard } from '@nizivo/react/trend-card';

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const PERCENT = { style: 'percent', maximumFractionDigits: 1 } as const;

const RANGES = [
  ['today', 'Today'],
  ['7d', '7D'],
  ['30d', '30D'],
  ['90d', '90D'],
  ['12m', '12M'],
] as const;

interface Kpi {
  label: string;
  value: number;
  format?: Intl.NumberFormatOptions;
  delta: number;
  trend: number[];
}

const KPIS: Kpi[] = [
  { label: 'Sessions', value: 18240, delta: 0.094, trend: [40, 42, 41, 45, 44, 47, 49, 52, 55] },
  {
    label: 'Conversion',
    value: 0.032,
    format: PERCENT,
    delta: -0.031,
    trend: [27, 25, 26, 22, 23, 20, 21, 18, 17],
  },
  {
    label: 'Total sales',
    value: 48290,
    format: USD,
    delta: 0.124,
    trend: [12, 14, 13, 17, 16, 19, 18, 22, 27],
  },
  {
    label: 'Bounce rate',
    value: 0.412,
    format: PERCENT,
    delta: 0.018,
    trend: [30, 31, 30, 32, 33, 32, 34, 33, 35],
  },
];

interface Day {
  date: string;
  sales: number;
  previous: number;
  orders: number;
}

/** Thirty days of fictional sales, deterministic so the server and the browser agree. */
const DAYS: Day[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  sales: Math.round(1300 + i * 22 + Math.sin(i / 2.2) * 260 + (i % 4) * 40),
  previous: Math.round(1250 + i * 9 + Math.cos(i / 3) * 180),
  orders: Math.round(34 + i * 0.6 + Math.sin(i / 2.2) * 7 + (i % 4)),
}));

const CHANNELS = [
  { name: 'Web store', sales: 26410 },
  { name: 'Instagram', sales: 12880 },
  { name: 'Markets', sales: 6120 },
  { name: 'Wholesale', sales: 2880 },
];

const GOALS = [
  ['sales', 'Monthly sales', 75],
  ['orders', 'Orders', 50],
  ['reviews', 'New reviews', 100],
  ['subscribers', 'Subscribers', 25],
] as const;

const PRODUCTS = [
  ['Stoneware mug', 8960],
  ['Speckled bowl', 6240],
  ['Linen apron', 4410],
  ['Pouring jug', 3180],
  ['Bud vase', 2240],
] as const;

/**
 * Figma 08's Pattern 6, Analytics: the content of the app shell's `<main>`. The page header with the
 * range (a SegmentedControl) and Export, four key figures with sparklines, then the report: total
 * sales against the previous period, goals as progress rings, the top products, sales by channel
 * and orders per day. Each chart sits in a Card whose title names it; the chart keeps that name for its
 * figure and its data table, with its own caption hidden.
 */
export function AnalyticsPageExample(): JSX.Element {
  const total = DAYS.reduce((sum, day) => sum + day.sales, 0);
  return (
    <div className="nzp-analytics-page">
      <PageHeader
        level={2}
        title="Analytics"
        actions={
          <>
            <SegmentedControl.Root aria-label="Range" name="range" defaultValue="30d">
              {RANGES.map(([value, label]) => (
                <SegmentedControl.Item key={value} value={value}>
                  {label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
            <Button leadingIcon={<Download />}>Export</Button>
          </>
        }
      />
      <section aria-label="Key figures" className="nzp-analytics-page-kpis">
        {KPIS.map((kpi) => (
          <KpiTile
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            format={kpi.format}
            delta={kpi.delta}
            comparison="vs last period"
            chart={<Sparkline data={kpi.trend} />}
          />
        ))}
      </section>
      <div className="nzp-analytics-page-report">
        <TrendCard
          className="nzp-analytics-page-wide"
          label="Total sales"
          value={total}
          format={USD}
          delta={0.124}
          comparison="vs previous 30 days"
          chart={
            <AreaChart
              title="Sales"
              summary="Daily sales, Oct 1–30, vs the previous 30 days"
              titleVisibility="hidden"
              data={DAYS}
              x="date"
              y="sales"
              compare="previous"
              format={USD}
              legend={false}
            />
          }
          legend={
            <Legend
              items={[
                { label: 'This period', series: 'current' },
                { label: 'Previous', series: 'previous' },
              ]}
            />
          }
        />
        <Card.Root render={<section aria-labelledby="nzp-analytics-goals" />}>
          <Card.Header>
            <Card.Title id="nzp-analytics-goals">Goals</Card.Title>
          </Card.Header>
          <ul className="nzp-analytics-page-goals">
            {GOALS.map(([id, label, value]) => (
              <li key={id} className="nzp-analytics-page-goal">
                <ProgressRing
                  meter
                  value={value}
                  tone={value === 100 ? 'success' : 'brand'}
                  aria-labelledby={`nzp-analytics-goal-${id}`}
                />
                <Text render={<span />} id={`nzp-analytics-goal-${id}`} variant="label-m">
                  {label}
                </Text>
              </li>
            ))}
          </ul>
        </Card.Root>
        <RankedList.Root
          title="Top products"
          format={USD}
          action={<RankedList.Action href="/analytics/products">View all</RankedList.Action>}
        >
          {PRODUCTS.map(([label, value]) => (
            <RankedList.Item key={label} label={label} value={value} />
          ))}
        </RankedList.Root>
        <Card.Root
          className="nzp-analytics-page-wide"
          render={<section aria-labelledby="nzp-analytics-channels" />}
        >
          <Card.Header>
            <Card.Title id="nzp-analytics-channels">Sales by channel</Card.Title>
          </Card.Header>
          <DonutChart
            title="Sales by channel"
            summary="Share of total sales, October"
            titleVisibility="hidden"
            data={CHANNELS}
            category={(d) => d.name}
            value={(d) => d.sales}
            format={USD}
            labels={{ category: 'Channel', value: 'Sales', total: 'Total sales' }}
          />
        </Card.Root>
        <Card.Root
          className="nzp-analytics-page-wide"
          render={<section aria-labelledby="nzp-analytics-orders" />}
        >
          <Card.Header>
            <Card.Title id="nzp-analytics-orders">Orders per day</Card.Title>
          </Card.Header>
          <BarChart
            title="Orders per day"
            summary="Orders per day, Oct 17–30"
            titleVisibility="hidden"
            data={DAYS.slice(16)}
            x={(d) => d.date}
            y={(d) => d.orders}
            dateFormat={{ day: 'numeric' }}
            labels={{ category: 'Day', value: 'Orders' }}
          />
        </Card.Root>
      </div>
    </div>
  );
}

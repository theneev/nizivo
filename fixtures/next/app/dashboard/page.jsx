// v0.2 exit (ARCHITECTURE.md §21.2, M41): the overview dashboard (Figma 08, 7275:15337) from Nizivo
// parts only. The KPI row (four KpiTiles with Sparkline slots) and "Top channels" (RankedList) are
// server parts that stream in behind Suspense; each fallback is the same part with
// status="loading", so nothing moves when the data arrives (§16.5). The TrendCard's AreaChart is
// the one interactive chart (the ChartInteraction island). Week 16 adds the rest of 08: the
// PageHeader (the greeting, the range as a SegmentedControl and Export), the Banner (dismissed by a
// Server Action), Goals and Recent orders (a Table). Nizivo client modules: the island, the
// SegmentedControl and BannerDismiss; PageHeader, Table, Card and ProgressBar ship none.
import { Suspense } from 'react';
import '@nizivo/charts/styles.css';
import { AreaChart } from '@nizivo/charts/area-chart';
import { Legend } from '@nizivo/charts/legend';
import { Banner, BannerDismiss } from '@nizivo/react/banner';
import { Button } from '@nizivo/react/button';
import { PageHeader } from '@nizivo/react/page-header';
import { SegmentedControl } from '@nizivo/react/segmented-control';
import { NativeSelect } from '@nizivo/react/native-select';
import { TrendCard } from '@nizivo/react/trend-card';
import { cookies } from 'next/headers';
import { RANGES, SALES, USD, USD_CENTS } from '../_dashboard/data.js';
import { Goals, RecentOrders } from '../_dashboard/orders.jsx';
import { KpiRow, KpiRowLoaded, TopChannels, TopChannelsLoaded } from '../_dashboard/parts.jsx';
import { dismissBanner } from './actions.js';

// Rendered per request, so the Suspense boundaries stream rather than prerender at build time.
export const dynamic = 'force-dynamic';

const TOTAL = SALES.reduce((sum, day) => sum + day.sales, 0);

export default async function Page() {
  const dismissed = (await cookies()).get('nz-fixture-banner')?.value === 'dismissed';
  return (
    <main className="dashboard">
      <PageHeader
        title="Good morning, Maya"
        actions={
          <>
            <SegmentedControl.Root aria-label="Range" name="range" defaultValue="30d">
              {RANGES.map(([value, label]) => (
                <SegmentedControl.Item key={value} value={value}>
                  {label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
            <Button>Export</Button>
          </>
        }
      />
      {dismissed ? null : (
        <Banner
          title="6 new posts need product tags"
          action={<Button variant="primary">Tag posts</Button>}
          dismiss={<BannerDismiss onDismiss={dismissBanner} />}
        >
          Tag them so shoppers can buy from your feed.
        </Banner>
      )}
      <Suspense fallback={<KpiRow status="loading" />}>
        <KpiRowLoaded />
      </Suspense>
      <div className="dashboard-sales">
        <TrendCard
          label="Total sales"
          value={TOTAL}
          format={USD_CENTS}
          delta={0.182}
          comparison="vs previous period"
          action={
            <NativeSelect aria-label="Period" defaultValue="14d">
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </NativeSelect>
          }
          chart={
            // the TrendCard's header titles the chart, so its caption is visually hidden; it still
            // names the figure and its table (titleVisibility, M42 item 15)
            <AreaChart
              title="Sales"
              summary="Daily sales, Oct 1–14, vs previous period"
              titleVisibility="hidden"
              data={SALES}
              x="date"
              y="sales"
              compare="previous"
              format={USD}
              legend={false}
            />
          }
          // the legend below the plot, as Figma's Revenue Card draws it (AreaChart's own would sit
          // between its caption and the plot)
          legend={
            <Legend
              items={[
                { label: 'This period', series: 'current' },
                { label: 'Previous', series: 'previous' },
              ]}
            />
          }
        />
        <div className="dashboard-side">
          <Suspense fallback={<TopChannels status="loading" />}>
            <TopChannelsLoaded />
          </Suspense>
          <Goals />
        </div>
      </div>
      <RecentOrders />
    </main>
  );
}

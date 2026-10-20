// The overview's KPI row and "Top channels", server parts only (M41): KpiTile and RankedList from
// @nizivo/react, Sparkline from @nizivo/charts through the tile's `chart` slot. None of them ships a
// client module. Each takes a §16.5 `status`, so the Suspense fallback is the same part, loading.
import { Sparkline } from '@nizivo/charts/sparkline';
import { KpiTile } from '@nizivo/react/kpi-tile';
import { RankedList } from '@nizivo/react/ranked-list';
import { CHANNELS, DELAY_MS, KPIS, USD } from './data.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function KpiRow({ status = 'ready' }) {
  return (
    <section aria-label="Key figures" className="dashboard-kpis" data-dashboard-kpis={status}>
      {KPIS.map((kpi) =>
        status === 'ready' ? (
          <KpiTile
            key={kpi.label}
            tone={kpi.tone}
            label={kpi.label}
            value={kpi.value}
            format={kpi.format}
            delta={kpi.delta}
            comparison="vs last week"
            chart={<Sparkline data={kpi.trend} />}
          />
        ) : (
          <KpiTile
            key={kpi.label}
            tone={kpi.tone}
            label={kpi.label}
            status={status}
            comparison="vs last week"
          />
        ),
      )}
    </section>
  );
}

export function TopChannels({ status = 'ready' }) {
  return (
    <RankedList.Root
      title="Top channels"
      titleLevel={2}
      status={status}
      format={USD}
      action={<RankedList.Action href="/dashboard-kpi">View all</RankedList.Action>}
    >
      {status === 'ready'
        ? CHANNELS.map(([label, value]) => (
            <RankedList.Item key={label} label={label} value={value} />
          ))
        : null}
    </RankedList.Root>
  );
}

/** The KPI row once its (slow) data arrives. */
export async function KpiRowLoaded() {
  await sleep(DELAY_MS);
  return <KpiRow />;
}

/** "Top channels" once its data arrives, a little after the KPIs. */
export async function TopChannelsLoaded() {
  await sleep(DELAY_MS + 200);
  return <TopChannels />;
}

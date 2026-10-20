import type { JSX } from 'react';
import { NativeSelect } from '../native-select/index';
import { TrendCard } from './index';

/**
 * Stand-ins for `<AreaChart … />` and `<Legend … />` from @nizivo/charts, which @nizivo/react never
 * imports: any element fits the slots.
 */
function Plot(): JSX.Element {
  return (
    <svg viewBox="0 0 720 280" width="100%" aria-hidden="true">
      <path
        d="M0 220 L80 190 L160 205 L240 150 L320 165 L400 120 L480 130 L560 80 L640 95 L720 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M0 235 L80 225 L160 228 L240 200 L320 210 L400 185 L480 190 L560 160 L640 170 L720 150"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 4"
        opacity="0.5"
      />
    </svg>
  );
}

/** The Revenue Card recipe (Figma 7275:13818): a docs example, not an export. */
export function TrendCardExample(): JSX.Element {
  return (
    <TrendCard
      label="Total sales"
      value={123307.4}
      format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
      delta={0.182}
      action={
        <NativeSelect aria-label="Period" defaultValue="30d" size="md">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </NativeSelect>
      }
      chart={<Plot />}
      legend={
        <>
          <span>Oct 1 – Oct 30</span>
          <span>Sep 1 – Sep 30</span>
        </>
      }
    />
  );
}

/** Loading: the same card; the chart takes the same status in an app (ChartFrame keeps its box). */
export function TrendCardLoadingExample(): JSX.Element {
  return <TrendCard label="Total sales" status="loading" chart={<Plot />} />;
}

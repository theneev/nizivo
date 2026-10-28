import type { JSX } from 'react';
import { FunnelChart } from './index';

interface Step {
  name: string;
  sessions: number;
}

// A store's checkout, sessions to purchases.
const CHECKOUT: Step[] = [
  { name: 'Sessions', sessions: 48210 },
  { name: 'Added to cart', sessions: 9642 },
  { name: 'Reached checkout', sessions: 4628 },
  { name: 'Purchased', sessions: 2914 },
];

export function FunnelChartExample(): JSX.Element {
  return (
    <FunnelChart
      title="Checkout funnel"
      summary="Sessions to purchases, October"
      data={CHECKOUT}
      step={(d) => d.name}
      value={(d) => d.sessions}
      labels={{ value: 'Sessions' }}
    />
  );
}

/** Formatted for Germany, with the values open under the funnel. */
export function FunnelChartLocaleExample(): JSX.Element {
  return (
    <FunnelChart
      title="Bestellprozess"
      data={[
        { name: 'Besuche', sessions: 12840 },
        { name: 'Warenkorb', sessions: 3210 },
        { name: 'Kasse', sessions: 1765 },
        { name: 'Gekauft', sessions: 1102 },
      ]}
      step={(d) => d.name}
      value={(d) => d.sessions}
      locale="de-DE"
      tableView="details"
      labels={{ step: 'Schritt', value: 'Besuche', share: '% vom vorigen', table: 'Werte' }}
    />
  );
}

/** Loading, empty and failed: the same box, the design's four-step height. */
export function FunnelChartStatusExample(): JSX.Element {
  return (
    <div>
      <FunnelChart
        title="Checkout funnel"
        status="loading"
        data={[]}
        step={(d: Step) => d.name}
        value={(d) => d.sessions}
      />
      <FunnelChart
        title="Checkout funnel"
        data={[]}
        step={(d: Step) => d.name}
        value={(d) => d.sessions}
      />
      <FunnelChart
        title="Checkout funnel"
        status="error"
        data={CHECKOUT}
        step={(d) => d.name}
        value={(d) => d.sessions}
      />
    </div>
  );
}

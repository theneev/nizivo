import type { JSX } from 'react';
import { Plus } from '@nizivo/icons';
import { Alert } from '@nizivo/react/alert';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { KpiTile } from '@nizivo/react/kpi-tile';
import { Meter, type MeterTone } from '@nizivo/react/meter';
import { PageHeader } from '@nizivo/react/page-header';
import { TabNav } from '@nizivo/react/tab-nav';
import { Text } from '@nizivo/react/text';

type Status = 'active' | 'scheduled' | 'expired';

interface Discount {
  code: string;
  offer: string;
  status: Status;
  /** When it starts or ends, as the store's own words; the `<time>` keeps the date. */
  when: [label: string, date: string];
  used: number;
  limit: number;
}

const DISCOUNTS: Discount[] = [
  {
    code: 'AUTUMN20',
    offer: '20% off all mugs and bowls',
    status: 'active',
    when: ['Ends Nov 30', '2026-11-30'],
    used: 312,
    limit: 500,
  },
  {
    code: 'FREESHIP',
    offer: 'Free shipping over $50',
    status: 'active',
    when: ['Ends Dec 31', '2026-12-31'],
    used: 846,
    limit: 1000,
  },
  {
    code: 'WELCOME10',
    offer: '10% off a first order',
    status: 'active',
    when: ['Ends Jan 31', '2027-01-31'],
    used: 128,
    limit: 1000,
  },
  {
    code: 'HOLIDAY25',
    offer: '25% off gift sets',
    status: 'scheduled',
    when: ['Starts Dec 1', '2026-12-01'],
    used: 0,
    limit: 300,
  },
  {
    code: 'NEWYEAR',
    offer: '$10 off orders over $60',
    status: 'scheduled',
    when: ['Starts Jan 1', '2027-01-01'],
    used: 0,
    limit: 200,
  },
  {
    code: 'SUMMER15',
    offer: '15% off tableware',
    status: 'expired',
    when: ['Ended Aug 31', '2026-08-31'],
    used: 400,
    limit: 400,
  },
];

const STATUS: Record<Status, [label: string, badge: BadgeTone, meter: MeterTone]> = {
  active: ['Active', 'success', 'brand'],
  scheduled: ['Scheduled', 'info', 'brand'],
  expired: ['Expired', 'neutral', 'neutral'],
};

const TABS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['scheduled', 'Scheduled'],
  ['expired', 'Expired'],
] as const;

/**
 * The Discounts page: the content of the app shell's `<main>`. The page header, a
 * notice, three key figures and the status links, then the discounts as a list of cards: each code
 * with its offer, its status in words, its dates and a `Meter` of how many of its uses are taken. A
 * server composition: it ships no JavaScript.
 */
export function DiscountsPageExample(): JSX.Element {
  return (
    <div className="nzp-discounts-page">
      <PageHeader
        level={2}
        title="Discounts"
        actions={
          <Button variant="primary" leadingIcon={<Plus />}>
            Create discount
          </Button>
        }
      />
      <Alert title="Discounts now stack with free shipping">
        A code and free shipping can apply to the same order. Edit a discount to turn it off.
      </Alert>
      <section aria-label="Key figures" className="nzp-discounts-page-kpis">
        <KpiTile label="Active discounts" value={3} delta={0.5} comparison="vs Sep" />
        <KpiTile label="Uses · 30 days" value={1284} delta={0.152} comparison="vs Sep" />
        <KpiTile
          label="Discounted sales"
          value={8920}
          format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
          delta={0.087}
          comparison="vs Sep"
        />
      </section>
      <TabNav.Root aria-label="Discount status">
        {TABS.map(([value, label]) => (
          <TabNav.Link key={value} href={`?status=${value}`} current={value === 'all'}>
            {label}
          </TabNav.Link>
        ))}
      </TabNav.Root>
      <ul className="nzp-discounts-page-list" aria-label="Discounts">
        {DISCOUNTS.map((discount) => {
          const [label, badge, tone] = STATUS[discount.status];
          return (
            <Card.Root key={discount.code} render={<li />} className="nzp-discounts-page-card">
              <Card.Header>
                <Card.Title>
                  <Text render={<span />} variant="mono-m-strong">
                    {discount.code}
                  </Text>
                </Card.Title>
                <Card.Description>{discount.offer}</Card.Description>
                <Card.Action>
                  <Badge tone={badge}>{label}</Badge>
                </Card.Action>
              </Card.Header>
              <Meter
                label="Uses"
                value={discount.used}
                max={discount.limit}
                tone={tone}
                valueText={`${String(discount.used)} of ${String(discount.limit)}`}
              />
              <Card.Footer className="nzp-discounts-page-footer">
                <Text render={<span />} tone="secondary">
                  <time dateTime={discount.when[1]}>{discount.when[0]}</time>
                </Text>
                <Button size="sm" aria-label={`Edit ${discount.code}`}>
                  Edit
                </Button>
              </Card.Footer>
            </Card.Root>
          );
        })}
      </ul>
    </div>
  );
}

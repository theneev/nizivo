import type { JSX } from 'react';
import { Tag } from '@nizivo/icons';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Card } from '@nizivo/react/card';
import { Meter } from '@nizivo/react/meter';
import { NumberValue } from '@nizivo/react/number-value';
import { Text } from '@nizivo/react/text';

type Status = 'active' | 'scheduled' | 'expired';

/** Each status's words and tone. The words carry the meaning; the tone only repeats it. */
const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  expired: { label: 'Expired', tone: 'neutral' },
};

// An explicit locale and time zone, so the server and the browser print the same text.
const DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const COUNT = new Intl.NumberFormat('en-US');

interface Discount {
  code: string;
  title: string;
  status: Status;
  used: number;
  /** The most uses allowed; `null` for no limit. */
  limit: number | null;
  /** A UTC instant: when it starts (scheduled) or when it ends (active, expired). */
  date: string;
}

const DISCOUNTS: Discount[] = [
  {
    code: 'AUTUMN20',
    title: '20% off all orders',
    status: 'active',
    used: 310,
    limit: 500,
    date: '2026-11-30T23:59:00Z',
  },
  {
    code: 'FREESHIP',
    title: 'Free shipping over $50',
    status: 'scheduled',
    used: 0,
    limit: 1000,
    date: '2026-11-01T00:00:00Z',
  },
  {
    code: 'SUMMER15',
    title: '15% off summer linen',
    status: 'expired',
    used: 500,
    limit: 500,
    date: '2026-09-30T23:59:00Z',
  },
  {
    code: 'WELCOME10',
    title: '10% off a first order',
    status: 'active',
    used: 1284,
    limit: null,
    date: '2026-12-31T23:59:00Z',
  },
];

/** The schedule line: when the discount starts, ends or ended. */
function schedule(discount: Discount): string {
  const day = DAY.format(new Date(discount.date));
  if (discount.status === 'scheduled') return `Starts ${day}`;
  return discount.status === 'expired' ? `Ended ${day}` : `Ends ${day}`;
}

/** Usage: a Meter against the limit, read as "310 of 500 used"; with no limit, a count. */
function Usage({ discount }: { discount: Discount }): JSX.Element {
  if (discount.limit === null) {
    return (
      <Text tone="secondary">
        <NumberValue value={discount.used} /> used · no limit
      </Text>
    );
  }
  return (
    <Meter
      label="Usage"
      value={discount.used}
      max={discount.limit}
      tone={discount.status === 'expired' ? 'neutral' : 'brand'}
      valueText={`${COUNT.format(discount.used)} of ${COUNT.format(discount.limit)} used`}
    />
  );
}

/** One discount: its code, what it gives, its status, how much of it is used and its dates. */
function DiscountCard({ discount }: { discount: Discount }): JSX.Element {
  const status = STATUS[discount.status];
  return (
    <Card.Root
      className="nzp-discount-card"
      render={<article aria-label={`${discount.code}, ${discount.title}`} />}
    >
      <div className="nzp-discount-card-top">
        <Text
          render={<span />}
          variant="mono-m-strong"
          className={
            discount.status === 'expired'
              ? 'nzp-discount-card-code nzp-discount-card-code-expired'
              : 'nzp-discount-card-code'
          }
        >
          <Tag size={16} />
          {discount.code}
        </Text>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <Card.Title>{discount.title}</Card.Title>
      <Usage discount={discount} />
      <Text tone="secondary">{schedule(discount)}</Text>
    </Card.Root>
  );
}

/**
 * Discount Cards: Active, Scheduled and Expired, plus a code with no usage
 * limit, not in the design. Usage is a `Meter` read as "310 of 500 used". The expired card
 * keeps full-contrast text: only its status, its code and its meter turn neutral. A server
 * composition: it ships no JavaScript.
 */
export function DiscountCardExample(): JSX.Element {
  return (
    <ul className="nzp-discount-card-grid" aria-label="Discounts">
      {DISCOUNTS.map((discount) => (
        <li key={discount.code}>
          <DiscountCard discount={discount} />
        </li>
      ))}
    </ul>
  );
}

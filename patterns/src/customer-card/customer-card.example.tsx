import type { JSX } from 'react';
import { Avatar } from '@nizivo/react/avatar';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Card } from '@nizivo/react/card';
import { NumberValue } from '@nizivo/react/number-value';
import { Text } from '@nizivo/react/text';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

interface Customer {
  name: string;
  email: string;
  orders: number;
  spent: number;
  tags: { label: string; tone: BadgeTone }[];
}

const CUSTOMER: Customer = {
  name: 'Jonah Okafor',
  email: 'jonah@example.com',
  orders: 14,
  spent: 1284,
  tags: [
    { label: 'VIP', tone: 'brand' },
    { label: 'Subscriber', tone: 'neutral' },
  ],
};

/** One figure: a `<dt>` label over its `<dd>` value. */
function Stat({ label, children }: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="nzp-customer-card-stat">
      <Text render={<dt />} variant="label-m" tone="secondary">
        {label}
      </Text>
      <Text render={<dd />} variant="numeric-m">
        {children}
      </Text>
    </div>
  );
}

/**
 * A Customer Card: who they are, what they are worth and how
 * to reach them. The email is a link; the figures are a description list. A server composition: it
 * ships no JavaScript. Without a photo the Avatar shows the initials; with one, pass its `src`.
 */
export function CustomerCardExample(): JSX.Element {
  const average = CUSTOMER.spent / CUSTOMER.orders;
  return (
    <Card.Root
      className="nzp-customer-card"
      render={<section aria-labelledby="customer-card-name" />}
    >
      <div className="nzp-customer-card-identity">
        <Avatar name={CUSTOMER.name} size="xl" decorative />
        <div className="nzp-customer-card-name">
          <Card.Title id="customer-card-name">{CUSTOMER.name}</Card.Title>
          <a className="nzp-customer-card-email" href={`mailto:${CUSTOMER.email}`}>
            {CUSTOMER.email}
          </a>
        </div>
      </div>
      <dl className="nzp-customer-card-stats">
        <Stat label="Orders">
          <NumberValue value={CUSTOMER.orders} />
        </Stat>
        <Stat label="Total spent">
          <NumberValue value={CUSTOMER.spent} format={USD} />
        </Stat>
        <Stat label="Avg. order">
          <NumberValue value={average} format={USD} />
        </Stat>
      </dl>
      <ul className="nzp-customer-card-tags" aria-label="Tags">
        {CUSTOMER.tags.map((tag) => (
          <li key={tag.label}>
            <Badge tone={tag.tone} dot={false}>
              {tag.label}
            </Badge>
          </li>
        ))}
      </ul>
    </Card.Root>
  );
}

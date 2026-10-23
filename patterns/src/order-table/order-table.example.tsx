import type { JSX } from 'react';
import { Avatar } from '@nizivo/react/avatar';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Inline } from '@nizivo/react/inline';
import { NumberValue } from '@nizivo/react/number-value';
import { Table } from '@nizivo/react/table';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

// An explicit locale and time zone, so the server and the browser print the same text.
const PLACED = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

type Payment = 'paid' | 'pending' | 'refunded';
type Fulfillment = 'fulfilled' | 'unfulfilled' | 'on-hold';

/** Each status's words and tone. The words carry the meaning; the tone only repeats it. */
const PAYMENT: Record<Payment, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

const FULFILLMENT: Record<Fulfillment, { label: string; tone: BadgeTone }> = {
  fulfilled: { label: 'Fulfilled', tone: 'success' },
  unfulfilled: { label: 'Unfulfilled', tone: 'warning' },
  'on-hold': { label: 'On hold', tone: 'neutral' },
};

interface Order {
  number: string;
  /** A UTC instant, as the server stores it. */
  placed: string;
  customer: string;
  payment: Payment;
  fulfillment: Fulfillment;
  total: number;
}

const ORDERS: Order[] = [
  {
    number: '1042',
    placed: '2026-10-14T09:12:00Z',
    customer: 'Maya Lindqvist',
    payment: 'paid',
    fulfillment: 'unfulfilled',
    total: 112,
  },
  {
    number: '1041',
    placed: '2026-10-14T08:47:00Z',
    customer: 'Jonah Okafor',
    payment: 'paid',
    fulfillment: 'fulfilled',
    total: 64,
  },
  {
    number: '1040',
    placed: '2026-10-13T17:05:00Z',
    customer: 'Priya Raman',
    payment: 'pending',
    fulfillment: 'on-hold',
    total: 238.5,
  },
  {
    number: '1039',
    placed: '2026-10-13T11:30:00Z',
    customer: 'Leo Marchetti',
    payment: 'refunded',
    fulfillment: 'fulfilled',
    total: 46,
  },
];

/**
 * Figma 05's Order Row (`7275:14091`) as an order list. The order number is a stretched link, so
 * the whole row is its hit area and the row is one Tab stop. Payment and fulfilment are two Badges
 * with words, never colour alone. A server composition: it ships no JavaScript.
 */
export function OrderTableExample(): JSX.Element {
  return (
    <Table.Container label="Orders">
      <Table.Root>
        <Table.Caption visuallyHidden>Orders</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.Head>Order</Table.Head>
            <Table.Head>Date</Table.Head>
            <Table.Head>Customer</Table.Head>
            <Table.Head>Payment</Table.Head>
            <Table.Head>Fulfilment</Table.Head>
            <Table.Head numeric>Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {ORDERS.map((order) => (
            <Table.Row key={order.number} interactive>
              <Table.Cell>
                <Table.RowLink href={`#order-${order.number}`}>#{order.number}</Table.RowLink>
              </Table.Cell>
              <Table.Cell>
                <time dateTime={order.placed}>{PLACED.format(new Date(order.placed))}</time>
              </Table.Cell>
              <Table.Cell>
                <Inline gap="2">
                  <Avatar name={order.customer} size="sm" decorative />
                  {order.customer}
                </Inline>
              </Table.Cell>
              <Table.Cell>
                <Badge tone={PAYMENT[order.payment].tone}>{PAYMENT[order.payment].label}</Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge tone={FULFILLMENT[order.fulfillment].tone}>
                  {FULFILLMENT[order.fulfillment].label}
                </Badge>
              </Table.Cell>
              <Table.Cell numeric>
                <NumberValue value={order.total} format={USD} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}

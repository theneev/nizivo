import type { JSX } from 'react';
import { Avatar } from '../avatar/index';
import { Badge, type BadgeTone } from '../badge/index';
import { Inline } from '../inline/index';
import { Table } from '../table/index';
import { DataView } from './index';

interface Order {
  id: string;
  placed: string;
  customer: string;
  fulfilment: [string, BadgeTone];
  total: number;
}

/** Fixed data, as a server would load it; times are UTC instants. */
const ORDERS: readonly Order[] = [
  {
    id: '1042',
    placed: '2026-10-14T09:12:00Z',
    customer: 'Maya Rao',
    fulfilment: ['Unfulfilled', 'warning'],
    total: 112,
  },
  {
    id: '1041',
    placed: '2026-10-14T08:47:00Z',
    customer: 'Jonah Okafor',
    fulfilment: ['Fulfilled', 'success'],
    total: 64.5,
  },
  {
    id: '1040',
    placed: '2026-10-13T17:05:00Z',
    customer: 'Priya Shah',
    fulfilment: ['On hold', 'neutral'],
    total: 238,
  },
];

// An explicit locale and time zone: the server and the browser print the same text (§16.3).
const TIME = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** The same orders as table rows and as list rows; the root's width picks one. */
function Orders({ width }: { width: number }): JSX.Element {
  return (
    <DataView.Root style={{ inlineSize: width }}>
      <DataView.Table>
        <Table.Container>
          <Table.Root>
            <Table.Caption visuallyHidden>Recent orders</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.Head>Order</Table.Head>
                <Table.Head>Customer</Table.Head>
                <Table.Head>Fulfilment</Table.Head>
                <Table.Head numeric>Total</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {ORDERS.map((order) => (
                <Table.Row key={order.id} interactive>
                  <Table.Cell>
                    <Table.RowLink href={`#order-${order.id}`}>#{order.id}</Table.RowLink>
                  </Table.Cell>
                  <Table.Cell>
                    <Inline gap="2">
                      <Avatar name={order.customer} size="sm" decorative />
                      {order.customer}
                    </Inline>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge tone={order.fulfilment[1]}>{order.fulfilment[0]}</Badge>
                  </Table.Cell>
                  <Table.Cell numeric>{MONEY.format(order.total)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </DataView.Table>
      <DataView.List aria-label="Recent orders">
        {ORDERS.map((order) => (
          <DataView.Item key={order.id} interactive>
            <Avatar name={order.customer} size="lg" decorative />
            <span style={{ display: 'grid', flex: 1, gap: 2, minInlineSize: 0 }}>
              <DataView.ItemLink href={`#order-${order.id}`}>{order.customer}</DataView.ItemLink>
              <span style={{ font: 'var(--nz-font-mono-m)', color: 'var(--nz-text-tertiary)' }}>
                #{order.id} ·{' '}
                <time dateTime={order.placed}>{TIME.format(new Date(order.placed))}</time>
              </span>
            </span>
            <span style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
              <span style={{ font: 'var(--nz-font-numeric-m)' }}>{MONEY.format(order.total)}</span>
              <Badge tone={order.fulfilment[1]}>{order.fulfilment[0]}</Badge>
            </span>
          </DataView.Item>
        ))}
      </DataView.List>
    </DataView.Root>
  );
}

/** Wide (720 px): the table presentation, 08's Recent orders. */
export function DataViewExample(): JSX.Element {
  return <Orders width={720} />;
}

/** Narrow (360 px): the same orders as list rows, 08 Responsive's Order List Item. */
export function DataViewNarrowExample(): JSX.Element {
  return <Orders width={360} />;
}

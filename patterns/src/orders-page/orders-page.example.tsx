import type { JSX } from 'react';
import { Download, Plus } from '@nizivo/icons';
import { Avatar } from '@nizivo/react/avatar';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Drawer } from '@nizivo/react/drawer';
import { KpiTile } from '@nizivo/react/kpi-tile';
import { NumberValue } from '@nizivo/react/number-value';
import { PageHeader } from '@nizivo/react/page-header';
import { Pagination } from '@nizivo/react/pagination';
import { SearchField } from '@nizivo/react/search-field';
import { Separator } from '@nizivo/react/separator';
import { TabNav } from '@nizivo/react/tab-nav';
import { Table } from '@nizivo/react/table';
import { Text } from '@nizivo/react/text';

/** Money in the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

/** An explicit locale and time zone, so the server and the browser print the same text. */
const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

type State = [label: string, tone: BadgeTone];

interface Order {
  id: number;
  placed: string;
  customer: string;
  shipTo: string;
  lines: [title: string, quantity: number, total: number][];
  payment: State;
  fulfilment: State;
}

const PAID: State = ['Paid', 'success'];
const PENDING: State = ['Pending', 'warning'];
const UNFULFILLED: State = ['Unfulfilled', 'warning'];
const FULFILLED: State = ['Fulfilled', 'neutral'];

const ORDERS: Order[] = [
  {
    id: 1042,
    placed: '2026-10-23T09:12:00Z',
    customer: 'Maya Lindqvist',
    shipTo: '14 Harbour Row, Bristol BS1 5TY',
    lines: [
      ['Stoneware mug', 2, 56],
      ['Waffle tea towel', 1, 12],
    ],
    payment: PAID,
    fulfilment: UNFULFILLED,
  },
  {
    id: 1041,
    placed: '2026-10-23T08:47:00Z',
    customer: 'Jonah Okafor',
    shipTo: '2 Mill Lane, Leeds LS6 2AB',
    lines: [['Speckled bowl', 3, 72]],
    payment: PAID,
    fulfilment: UNFULFILLED,
  },
  {
    id: 1040,
    placed: '2026-10-22T17:30:00Z',
    customer: 'Priya Shah',
    shipTo: '88 Elm Street, Brighton BN1 4EE',
    lines: [
      ['Bud vase', 1, 32],
      ['Side plate', 4, 58],
    ],
    payment: PENDING,
    fulfilment: UNFULFILLED,
  },
  {
    id: 1039,
    placed: '2026-10-22T14:05:00Z',
    customer: 'Tomás Ribeiro',
    shipTo: '5 Quay Street, Cardiff CF10 1EA',
    lines: [['Pouring jug', 1, 38]],
    payment: PAID,
    fulfilment: FULFILLED,
  },
  {
    id: 1038,
    placed: '2026-10-22T10:21:00Z',
    customer: 'Aiko Tanaka',
    shipTo: '41 Castle Road, York YO1 7HH',
    lines: [
      ['Linen apron', 1, 42],
      ['Stoneware mug', 1, 28],
    ],
    payment: PAID,
    fulfilment: FULFILLED,
  },
  {
    id: 1037,
    placed: '2026-10-21T19:58:00Z',
    customer: 'Sam Whitfield',
    shipTo: '9 Garden Walk, Bath BA1 2QS',
    lines: [['Coaster set', 2, 36]],
    payment: PAID,
    fulfilment: FULFILLED,
  },
];

const TABS = [
  ['all', 'All'],
  ['unfulfilled', 'Unfulfilled'],
  ['unpaid', 'Unpaid'],
  ['open', 'Open'],
  ['archived', 'Archived'],
] as const;

function total(order: Order): number {
  return order.lines.reduce((sum, [, , amount]) => sum + amount, 0);
}

/** One order's details, from the end edge: its lines, its total and where it ships. */
function OrderDrawer({ order }: { order: Order }): JSX.Element {
  return (
    <Drawer.Root>
      <Drawer.Trigger
        render={
          <Button variant="tertiary" size="sm" aria-label={`View order ${String(order.id)}`}>
            View
          </Button>
        }
      />
      <Drawer.Popup side="end">
        <Drawer.Header>
          <Drawer.Title level={2}>Order #{order.id}</Drawer.Title>
          <Drawer.Description>
            <Badge tone={order.payment[1]}>{order.payment[0]}</Badge>{' '}
            <Badge tone={order.fulfilment[1]}>{order.fulfilment[0]}</Badge>
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Close />
        <Drawer.Body>
          <ul className="nzp-orders-page-lines">
            {order.lines.map(([title, quantity, amount]) => (
              <li key={title} className="nzp-orders-page-line">
                <span className="nzp-orders-page-thumb" aria-hidden="true" />
                <Text render={<span />} variant="label-m-strong">
                  {title}
                </Text>
                <Text render={<span />} variant="mono-m" tone="secondary">
                  ×{quantity}
                </Text>
                <Text render={<span />} variant="numeric-m">
                  <NumberValue value={amount} format={USD} />
                </Text>
              </li>
            ))}
          </ul>
          <Separator />
          <dl className="nzp-orders-page-facts">
            <div>
              <Text render={<dt />} tone="secondary">
                Total
              </Text>
              <Text render={<dd />} variant="numeric-m">
                <NumberValue value={total(order)} format={USD} />
              </Text>
            </div>
            <div>
              <Text render={<dt />} tone="secondary">
                Placed
              </Text>
              <dd>
                <time dateTime={order.placed}>{WHEN.format(new Date(order.placed))}</time>
              </dd>
            </div>
            <div>
              <Text render={<dt />} tone="secondary">
                Ship to
              </Text>
              <dd>
                {order.customer}, {order.shipTo}
              </dd>
            </div>
          </dl>
        </Drawer.Body>
        <Drawer.Footer>
          <Button>Print label</Button>
          <Button variant="primary">Fulfil order</Button>
        </Drawer.Footer>
      </Drawer.Popup>
    </Drawer.Root>
  );
}

/**
 * Figma 08's Pattern 3, Orders: the content of the app shell's `<main>`. The page header, four key
 * figures, then the orders card: status filters as links, a search form, the orders table and
 * pagination. Each row's View opens that order in a `Drawer` from the end edge, over a scrim; the
 * drawer is the only client part besides the search field.
 */
export function OrdersPageExample(): JSX.Element {
  return (
    <div className="nzp-orders-page">
      <PageHeader
        level={2}
        title="Orders"
        actions={
          <>
            <Button leadingIcon={<Download />}>Export</Button>
            <Button variant="primary" leadingIcon={<Plus />}>
              Create order
            </Button>
          </>
        }
      />
      <section aria-label="Key figures" className="nzp-orders-page-kpis">
        <KpiTile label="Orders today" value={38} delta={0.118} comparison="vs yesterday" />
        <KpiTile label="Items ordered" value={74} delta={0.064} comparison="vs yesterday" />
        <KpiTile
          label="Average order value"
          value={64.2}
          format={USD}
          delta={0.031}
          comparison="vs last week"
        />
        <KpiTile
          label="Fulfilled on time"
          value={0.964}
          format={{ style: 'percent', maximumFractionDigits: 1 }}
          delta={0.012}
          comparison="vs last week"
        />
      </section>
      <Card.Root className="nzp-orders-page-card">
        <div className="nzp-orders-page-toolbar">
          <TabNav.Root aria-label="Order status">
            {TABS.map(([value, label]) => (
              <TabNav.Link key={value} href={`?status=${value}`} current={value === 'all'}>
                {label}
              </TabNav.Link>
            ))}
          </TabNav.Root>
          <form method="get" className="nzp-orders-page-search">
            <SearchField name="q" placeholder="Search orders" labels={{ label: 'Search orders' }} />
          </form>
        </div>
        <Table.Container className="nzp-orders-page-table">
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
                <Table.Head>Details</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {ORDERS.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Head scope="row">
                    <Text render={<span />} variant="mono-m">
                      #{order.id}
                    </Text>
                  </Table.Head>
                  <Table.Cell>
                    <time dateTime={order.placed}>{WHEN.format(new Date(order.placed))}</time>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="nzp-orders-page-customer">
                      <Avatar name={order.customer} size="sm" decorative />
                      {order.customer}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge tone={order.payment[1]}>{order.payment[0]}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge tone={order.fulfilment[1]}>{order.fulfilment[0]}</Badge>
                  </Table.Cell>
                  <Table.Cell numeric>
                    <NumberValue value={total(order)} format={USD} />
                  </Table.Cell>
                  <Table.Cell>
                    <OrderDrawer order={order} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Container>
        <Pagination
          className="nzp-orders-page-pagination"
          page={1}
          totalPages={9}
          size="sm"
          siblingCount={0}
          getHref={(page) => `?page=${String(page)}`}
          summary="Showing 1–6 of 52"
        />
      </Card.Root>
    </div>
  );
}

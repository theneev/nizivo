import type { JSX } from 'react';
import { Avatar } from '../avatar/index';
import { Badge, type BadgeTone } from '../badge/index';
import { Button } from '../button/index';
import { Inline } from '../inline/index';
import { Stack } from '../stack/index';
import { Table } from './index';

interface Order {
  id: string;
  placed: string;
  customer: string;
  payment: [string, BadgeTone];
  fulfilment: [string, BadgeTone];
  total: number;
}

/** Fixed data, as a server would load it; times are UTC instants. */
const ORDERS: readonly Order[] = [
  {
    id: '1042',
    placed: '2026-10-14T09:12:00Z',
    customer: 'Maya Rao',
    payment: ['Paid', 'success'],
    fulfilment: ['Unfulfilled', 'warning'],
    total: 112,
  },
  {
    id: '1041',
    placed: '2026-10-14T08:47:00Z',
    customer: 'Jonah Okafor',
    payment: ['Paid', 'success'],
    fulfilment: ['Fulfilled', 'success'],
    total: 64.5,
  },
  {
    id: '1040',
    placed: '2026-10-13T17:05:00Z',
    customer: 'Priya Shah',
    payment: ['Pending', 'warning'],
    fulfilment: ['On hold', 'neutral'],
    total: 238,
  },
  {
    id: '1039',
    placed: '2026-10-13T11:30:00Z',
    customer: 'Leo Martin',
    payment: ['Refunded', 'neutral'],
    fulfilment: ['Fulfilled', 'success'],
    total: 28,
  },
];

// An explicit locale and time zone: the server and the browser print the same text (§16.3).
const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * 08's Recent orders (Figma Order Row): each row links to its order through the order number, a
 * stretched link, so the whole row is the hit area. The caption names the table and is hidden,
 * because the card above it shows the same words.
 */
export function TableOrdersExample(): JSX.Element {
  return (
    <Table.Container>
      <Table.Root>
        <Table.Caption visuallyHidden>Recent orders</Table.Caption>
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
            <Table.Row key={order.id} interactive>
              <Table.Cell>
                <Table.RowLink href={`#order-${order.id}`}>#{order.id}</Table.RowLink>
              </Table.Cell>
              <Table.Cell>
                <time dateTime={order.placed}>{WHEN.format(new Date(order.placed))}</time>
              </Table.Cell>
              <Table.Cell>
                <Inline gap="2">
                  <Avatar name={order.customer} size="sm" decorative />
                  {order.customer}
                </Inline>
              </Table.Cell>
              <Table.Cell>
                <Badge tone={order.payment[1]}>{order.payment[0]}</Badge>
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
  );
}

/**
 * Sorting through the URL: each column's label is a link to the same page sorted by it, and the
 * sorted column's `<th>` carries `aria-sort`. The page reads `?sort=` on the server; no client code.
 */
export function TableSortExample(): JSX.Element {
  return (
    <Table.Container>
      <Table.Root>
        <Table.Caption>Products, by price, highest first</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.Head>
              <Table.SortButton href="?sort=name">Product</Table.SortButton>
            </Table.Head>
            <Table.Head>
              <Table.SortButton href="?sort=stock">Inventory</Table.SortButton>
            </Table.Head>
            <Table.Head numeric sort="descending">
              <Table.SortButton href="?sort=price">Price</Table.SortButton>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Head scope="row">Linen apron</Table.Head>
            <Table.Cell>8 in stock</Table.Cell>
            <Table.Cell numeric>$42.00</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Head scope="row">Stoneware mug</Table.Head>
            <Table.Cell>124 in stock</Table.Cell>
            <Table.Cell numeric>$28.00</Table.Cell>
          </Table.Row>
          <Table.Row selected>
            <Table.Head scope="row">Ceramic coaster set</Table.Head>
            <Table.Cell>Sold out</Table.Cell>
            <Table.Cell numeric>$18.50</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}

const PRODUCTS = [
  ['mug-014', 'Stoneware mug', '124 in stock', 28],
  ['apron-002', 'Linen apron', '8 in stock', 42],
  ['coaster-007', 'Ceramic coaster set', 'Sold out', 18.5],
  ['bowl-021', 'Speckled bowl', '36 in stock', 24],
] as const;

/**
 * Bulk actions: each row's checkbox is a native input of the form above the table (`form`), so
 * "Archive" submits the checked ids even before JavaScript runs. `Table.Selection` adds the
 * select-all box (checked, mixed or clear), Shift-click ranges and Escape to clear.
 */
export function TableSelectionExample(): JSX.Element {
  return (
    <Stack gap="3">
      <Table.Selection>
        <form id="products-bulk" action="#">
          <Button type="submit" size="sm">
            Archive selected
          </Button>
        </form>
        <Table.Container>
          <Table.Root>
            <Table.Caption visuallyHidden>Products</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.Head>
                  <Table.SelectAll />
                </Table.Head>
                <Table.Head>Product</Table.Head>
                <Table.Head>Inventory</Table.Head>
                <Table.Head numeric>Price</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {PRODUCTS.map(([id, name, stock, price]) => (
                <Table.Row key={id}>
                  <Table.Cell>
                    <Table.SelectRow
                      value={id}
                      form="products-bulk"
                      aria-label={`Select ${name}`}
                      defaultChecked={id === 'apron-002'}
                    />
                  </Table.Cell>
                  <Table.Head scope="row">{name}</Table.Head>
                  <Table.Cell>{stock}</Table.Cell>
                  <Table.Cell numeric>{MONEY.format(price)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </Table.Selection>
    </Stack>
  );
}

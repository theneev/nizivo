// The overview's "Recent orders" and "Goals" cards (Figma 08, 7275:15337): Card, Table, Badge,
// Avatar and ProgressBar, all server parts. Each row links to its order through the order number,
// a stretched link, so the whole row is the hit area.
import { Avatar } from '@nizivo/react/avatar';
import { Badge } from '@nizivo/react/badge';
import { Card } from '@nizivo/react/card';
import { Inline } from '@nizivo/react/inline';
import { ProgressBar } from '@nizivo/react/progress-bar';
import { Table } from '@nizivo/react/table';
import { GOAL, ORDERS } from './data.js';

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

export function RecentOrders() {
  return (
    <Card.Root render={<section aria-labelledby="recent-orders" />}>
      <Card.Header>
        <Card.Title level={2} id="recent-orders">
          Recent orders
        </Card.Title>
        <Card.Action>
          {/* Figma: a plain text link, Label/M in text/brand */}
          <a className="dashboard-link" href="/dashboard-kpi">
            View all
          </a>
        </Card.Action>
      </Card.Header>
      <Table.Container>
        <Table.Root aria-labelledby="recent-orders">
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
            {ORDERS.map(([id, placed, customer, payment, fulfilment, total]) => (
              <Table.Row key={id} interactive>
                <Table.Cell>
                  <Table.RowLink href={`/dashboard?order=${String(id)}`}>#{id}</Table.RowLink>
                </Table.Cell>
                <Table.Cell>
                  <time dateTime={placed}>{WHEN.format(new Date(placed))}</time>
                </Table.Cell>
                <Table.Cell>
                  <Inline gap="2">
                    <Avatar name={customer} size="sm" decorative />
                    {customer}
                  </Inline>
                </Table.Cell>
                <Table.Cell>
                  <Badge tone={payment[1]}>{payment[0]}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge tone={fulfilment[1]}>{fulfilment[0]}</Badge>
                </Table.Cell>
                <Table.Cell numeric>{MONEY.format(total)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.Container>
    </Card.Root>
  );
}

export function Goals() {
  return (
    <Card.Root render={<section aria-labelledby="goals" />}>
      <Card.Header>
        <Card.Title level={2} id="goals">
          Goals
        </Card.Title>
      </Card.Header>
      <ProgressBar label="Monthly goal" value={GOAL.sales} max={GOAL.target} />
    </Card.Root>
  );
}

import type { JSX } from 'react';
import { Download, UserPlus } from '@nizivo/icons';
import { Avatar } from '@nizivo/react/avatar';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { KpiTile } from '@nizivo/react/kpi-tile';
import { NumberValue } from '@nizivo/react/number-value';
import { PageHeader } from '@nizivo/react/page-header';
import { RankedList } from '@nizivo/react/ranked-list';
import { Split } from '@nizivo/react/split';
import { TabNav } from '@nizivo/react/tab-nav';
import { Table } from '@nizivo/react/table';
import { Text } from '@nizivo/react/text';

/** Money in the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

interface Customer {
  id: string;
  name: string;
  email: string;
  city: string;
  orders: number;
  spent: number;
  vip: boolean;
}

const CUSTOMERS: Customer[] = [
  {
    id: 'c-201',
    name: 'Maya Lindqvist',
    email: 'maya@example.com',
    city: 'Bristol',
    orders: 14,
    spent: 1284.5,
    vip: true,
  },
  {
    id: 'c-187',
    name: 'Jonah Okafor',
    email: 'jonah@example.com',
    city: 'Leeds',
    orders: 9,
    spent: 642,
    vip: true,
  },
  {
    id: 'c-176',
    name: 'Priya Shah',
    email: 'priya@example.com',
    city: 'Brighton',
    orders: 6,
    spent: 418.2,
    vip: false,
  },
  {
    id: 'c-163',
    name: 'Tomás Ribeiro',
    email: 'tomas@example.com',
    city: 'Cardiff',
    orders: 4,
    spent: 236,
    vip: false,
  },
  {
    id: 'c-158',
    name: 'Aiko Tanaka',
    email: 'aiko@example.com',
    city: 'York',
    orders: 3,
    spent: 154.5,
    vip: false,
  },
  {
    id: 'c-142',
    name: 'Sam Whitfield',
    email: 'sam@example.com',
    city: 'Bath',
    orders: 1,
    spent: 36,
    vip: false,
  },
];

const SEGMENTS = [
  ['all', 'All', '1,280'],
  ['vip', 'VIP', '24'],
  ['subscribers', 'Subscribers', '311'],
  ['at-risk', 'At risk', '214'],
] as const;

const CITIES = [
  ['Bristol', 186],
  ['Leeds', 142],
  ['Brighton', 118],
  ['Cardiff', 96],
  ['York', 71],
] as const;

/**
 * Figma 08's Pattern 4, Customers: the content of the app shell's `<main>`. The page header, three
 * key figures and the segment links, then two columns: the customers table, each name with its
 * `Avatar` (initials here; a photo through `src` in the app), and an aside with the top cities and a
 * win-back prompt. A server composition: it ships no JavaScript.
 */
export function CustomersPageExample(): JSX.Element {
  return (
    <div className="nzp-customers-page">
      <PageHeader
        level={2}
        title="Customers"
        actions={
          <>
            <Button leadingIcon={<Download />}>Export</Button>
            <Button variant="primary" leadingIcon={<UserPlus />}>
              Add customer
            </Button>
          </>
        }
      />
      <section aria-label="Key figures" className="nzp-customers-page-kpis">
        <KpiTile label="Customers" value={1280} delta={0.042} comparison="vs last month" />
        <KpiTile
          tone="brand"
          label="Returning rate"
          value={0.284}
          format={{ style: 'percent', maximumFractionDigits: 1 }}
          delta={0.021}
          comparison="vs last month"
        />
        <KpiTile
          label="Average lifetime value"
          value={142}
          format={{ ...USD, maximumFractionDigits: 0 }}
          delta={-0.013}
          comparison="vs last month"
        />
      </section>
      <TabNav.Root aria-label="Customer segments">
        {SEGMENTS.map(([value, label, count]) => (
          <TabNav.Link
            key={value}
            href={`?segment=${value}`}
            count={count}
            current={value === 'all'}
          >
            {label}
          </TabNav.Link>
        ))}
      </TabNav.Root>
      <Split.Root>
        <Split.Main>
          <Table.Container>
            <Table.Root>
              <Table.Caption visuallyHidden>Customers</Table.Caption>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Customer</Table.Head>
                  <Table.Head>City</Table.Head>
                  <Table.Head numeric>Orders</Table.Head>
                  <Table.Head numeric>Spent</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {CUSTOMERS.map((customer) => (
                  <Table.Row key={customer.id} interactive>
                    <Table.Cell>
                      <span className="nzp-customers-page-person">
                        <Avatar name={customer.name} decorative />
                        <span className="nzp-customers-page-name">
                          <span className="nzp-customers-page-title">
                            <Table.RowLink href={`/customers/${customer.id}`}>
                              {customer.name}
                            </Table.RowLink>
                            {customer.vip && <Badge tone="brand">VIP</Badge>}
                          </span>
                          <Text render={<span />} tone="secondary">
                            {customer.email}
                          </Text>
                        </span>
                      </span>
                    </Table.Cell>
                    <Table.Cell>{customer.city}</Table.Cell>
                    <Table.Cell numeric>{customer.orders}</Table.Cell>
                    <Table.Cell numeric>
                      <NumberValue value={customer.spent} format={USD} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.Container>
        </Split.Main>
        <Split.Aside className="nzp-customers-page-aside">
          <RankedList.Root
            title="Top cities"
            action={<RankedList.Action href="/customers/cities">View all</RankedList.Action>}
          >
            {CITIES.map(([city, count]) => (
              <RankedList.Item key={city} label={city} value={count} />
            ))}
          </RankedList.Root>
          <Card.Root tone="accent" render={<section aria-labelledby="nzp-customers-win-back" />}>
            <Card.Header>
              <Card.Title id="nzp-customers-win-back">Win back 214 lapsed buyers</Card.Title>
              <Card.Description>
                They last ordered more than 90 days ago. A small thank-you code brings many back.
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button variant="primary">Create a campaign</Button>
            </Card.Footer>
          </Card.Root>
        </Split.Aside>
      </Split.Root>
    </div>
  );
}

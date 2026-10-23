import type { JSX } from 'react';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Fieldset } from '@nizivo/react/fieldset';
import { Meter } from '@nizivo/react/meter';
import { NavItem } from '@nizivo/react/nav-item';
import { NumberValue } from '@nizivo/react/number-value';
import { PageHeader } from '@nizivo/react/page-header';
import { Split } from '@nizivo/react/split';
import { Switch } from '@nizivo/react/switch';
import { Table } from '@nizivo/react/table';
import { Text } from '@nizivo/react/text';

/** Money in the plan's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

const SECTIONS = [
  ['general', 'General'],
  ['billing', 'Plan & billing'],
  ['payments', 'Payments'],
  ['shipping', 'Shipping'],
  ['staff', 'Staff'],
  ['notifications', 'Notifications'],
  ['domains', 'Domains'],
] as const;

const USAGE = [
  ['Products', 248, 500, '248 of 500'],
  ['Staff accounts', 3, 5, '3 of 5'],
  ['Orders this month', 1284, 2000, '1,284 of 2,000'],
  ['File storage', 3.1, 5, '3.1 GB of 5 GB'],
] as const;

const INVOICES = [
  ['INV-0042', 'Oct 14, 2026', '2026-10-14', 29],
  ['INV-0037', 'Sep 14, 2026', '2026-09-14', 29],
  ['INV-0031', 'Aug 14, 2026', '2026-08-14', 29],
  ['INV-0026', 'Jul 14, 2026', '2026-07-14', 19],
] as const;

/**
 * Figma 08's Pattern 7, Settings · Plan & billing: the content of the app shell's `<main>`. The page
 * header, then the settings sections as a nav column beside the page: the current plan, its usage
 * on Meters, the payment method, the invoices table and the billing emails. Only the Switches are
 * client components.
 */
export function PlanBillingPageExample(): JSX.Element {
  return (
    <div className="nzp-plan-billing-page">
      <PageHeader level={2} title="Settings" />
      <Split.Root aside="narrow">
        <Split.Aside render={<nav aria-label="Settings sections" />}>
          <ul className="nzp-plan-billing-page-nav">
            {SECTIONS.map(([value, label]) => (
              <li key={value}>
                <NavItem href={`/settings/${value}`} current={value === 'billing'}>
                  {label}
                </NavItem>
              </li>
            ))}
          </ul>
        </Split.Aside>
        <Split.Main className="nzp-plan-billing-page-main">
          <Card.Root render={<section aria-labelledby="nzp-billing-plan" />}>
            <Card.Header>
              <Card.Title id="nzp-billing-plan">Plan</Card.Title>
              <Card.Description>Renews on Nov 14, 2026</Card.Description>
              <Card.Action>
                <Badge tone="brand">Current</Badge>
              </Card.Action>
            </Card.Header>
            <div className="nzp-plan-billing-page-plan">
              <Text render={<p />} variant="heading-h3">
                Grow
              </Text>
              <Text render={<p />} tone="secondary">
                <Text render={<span />} variant="numeric-l" tone="primary">
                  <NumberValue value={29} format={USD} />
                </Text>{' '}
                a month, billed monthly
              </Text>
            </div>
            <Card.Footer>
              <Button variant="primary">Change plan</Button>
              <Button variant="tertiary">Cancel plan</Button>
            </Card.Footer>
          </Card.Root>
          <Card.Root render={<section aria-labelledby="nzp-billing-usage" />}>
            <Card.Header>
              <Card.Title id="nzp-billing-usage">Usage</Card.Title>
              <Card.Description>What the Grow plan allows, this billing period.</Card.Description>
            </Card.Header>
            <div className="nzp-plan-billing-page-usage">
              {USAGE.map(([label, value, max, text]) => (
                <Meter
                  key={label}
                  label={label}
                  value={value}
                  max={max}
                  high={max * 0.8}
                  optimum={0}
                  valueText={text}
                />
              ))}
            </div>
          </Card.Root>
          <Card.Root render={<section aria-labelledby="nzp-billing-payment" />}>
            <Card.Header>
              <Card.Title id="nzp-billing-payment">Payment method</Card.Title>
              <Card.Action>
                <Button size="sm">Add method</Button>
              </Card.Action>
            </Card.Header>
            <div className="nzp-plan-billing-page-method">
              <span className="nzp-plan-billing-page-card-mark" aria-hidden="true" />
              <span className="nzp-plan-billing-page-card-text">
                <Text render={<span />} variant="label-m-strong">
                  Visa ending in 4242
                </Text>
                <Text render={<span />} tone="secondary">
                  Expires 08/2028
                </Text>
              </span>
              <Badge tone="neutral">Default</Badge>
              <Button size="sm" variant="tertiary" aria-label="Replace Visa ending in 4242">
                Replace
              </Button>
            </div>
          </Card.Root>
          <Card.Root render={<section aria-labelledby="nzp-billing-invoices" />}>
            <Card.Header>
              <Card.Title id="nzp-billing-invoices">Invoices</Card.Title>
            </Card.Header>
            <Table.Container>
              <Table.Root aria-labelledby="nzp-billing-invoices">
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Invoice</Table.Head>
                    <Table.Head>Date</Table.Head>
                    <Table.Head numeric>Amount</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>File</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {INVOICES.map(([id, date, iso, amount]) => (
                    <Table.Row key={id}>
                      <Table.Head scope="row">
                        <Text render={<span />} variant="mono-m">
                          {id}
                        </Text>
                      </Table.Head>
                      <Table.Cell>
                        <time dateTime={iso}>{date}</time>
                      </Table.Cell>
                      <Table.Cell numeric>
                        <NumberValue value={amount} format={USD} />
                      </Table.Cell>
                      <Table.Cell>
                        <Badge tone="success">Paid</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <a
                          className="nzp-plan-billing-page-link"
                          href={`/settings/billing/invoices/${id}.pdf`}
                          aria-label={`Download invoice ${id}`}
                        >
                          Download
                        </a>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.Container>
          </Card.Root>
          <Card.Root render={<section aria-labelledby="nzp-billing-emails" />}>
            <Card.Header>
              <Card.Title id="nzp-billing-emails">Billing emails</Card.Title>
            </Card.Header>
            <Fieldset legend="Send to the billing contact">
              <Switch name="billing-emails" value="invoices" defaultChecked>
                Invoices
              </Switch>
              <Switch name="billing-emails" value="failed" defaultChecked>
                Failed payments
              </Switch>
              <Switch name="billing-emails" value="usage">
                Usage reports
              </Switch>
            </Fieldset>
          </Card.Root>
        </Split.Main>
      </Split.Root>
    </div>
  );
}

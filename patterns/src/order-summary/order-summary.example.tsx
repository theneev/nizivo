import type { JSX } from 'react';
import { Card } from '@nizivo/react/card';
import { NumberValue } from '@nizivo/react/number-value';
import { Separator } from '@nizivo/react/separator';
import { Text } from '@nizivo/react/text';

/** Money as the order's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

interface LineItem {
  id: string;
  title: string;
  variant: string;
  quantity: number;
  /** The line's total, not the unit price (Figma 05 §3.10). */
  total: number;
}

const ITEMS: LineItem[] = [
  { id: 'mug', title: 'Stoneware mug', variant: 'Moss · 350 ml', quantity: 2, total: 56 },
  { id: 'bowl', title: 'Serving bowl', variant: 'Kiln white', quantity: 1, total: 42 },
  { id: 'plate', title: 'Side plate', variant: 'Ash · set of 4', quantity: 1, total: 14.5 },
];

/** One amount in the totals list: a `<dl>` pair, the value at the line's end in tabular figures. */
function Row({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="nzp-order-summary-row">
      <Text render={<dt />} tone="secondary">
        {label}
      </Text>
      <Text render={<dd />} variant="numeric-m">
        {typeof value === 'number' ? <NumberValue value={value} format={USD} /> : value}
      </Text>
    </div>
  );
}

/**
 * Figma 05's Order Summary (`754:897`, an orphan master): the order's lines, then its totals as a
 * description list. A server composition: it ships no JavaScript. Each line's thumbnail stands in for
 * the product's `Image`.
 */
export function OrderSummaryExample(): JSX.Element {
  const subtotal = ITEMS.reduce((sum, item) => sum + item.total, 0);
  const tax = 8.74;
  return (
    <Card.Root className="nzp-order-summary" render={<section aria-labelledby="order-1042" />}>
      <Card.Title id="order-1042">Order #1042</Card.Title>
      <ul className="nzp-order-summary-lines">
        {ITEMS.map((item) => (
          <li key={item.id} className="nzp-order-summary-line">
            <span className="nzp-order-summary-thumb" aria-hidden="true" />
            <span className="nzp-order-summary-item">
              <Text render={<span />} variant="label-m-strong">
                {item.title}
              </Text>
              <Text render={<span />} tone="tertiary">
                {item.variant}
              </Text>
            </span>
            <Text render={<span />} variant="mono-m" tone="tertiary">
              ×{item.quantity}
            </Text>
            <Text render={<span />} variant="numeric-m">
              <NumberValue value={item.total} format={USD} />
            </Text>
          </li>
        ))}
      </ul>
      <Separator />
      <dl className="nzp-order-summary-totals">
        <Row label="Subtotal" value={subtotal} />
        <Row label="Shipping" value="Free" />
        <Row label="Tax" value={tax} />
      </dl>
      <Separator />
      <dl className="nzp-order-summary-totals">
        <div className="nzp-order-summary-row">
          <Text render={<dt />} variant="label-l">
            Total
          </Text>
          <Text render={<dd />} variant="numeric-l">
            <NumberValue value={subtotal + tax} format={USD} />
          </Text>
        </div>
      </dl>
    </Card.Root>
  );
}

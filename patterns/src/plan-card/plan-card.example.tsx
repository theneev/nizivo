import type { ComponentPropsWithRef, JSX } from 'react';
import { Check, X } from '@nizivo/icons';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { NumberValue } from '@nizivo/react/number-value';
import { SegmentedControl } from '@nizivo/react/segmented-control';
import { Stack } from '@nizivo/react/stack';
import { Text } from '@nizivo/react/text';

/** Whole amounts in the store's currency: Intl formats them, never string concatenation. */
const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

type Interval = 'month' | 'year';

interface Feature {
  label: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  tagline: string;
  /** The price for each interval. */
  price: Record<Interval, number>;
  features: Feature[];
  /** The recommended plan: the one inverse card, with the accent CTA. */
  featured: boolean;
}

const BASIC: Plan = {
  id: 'basic',
  name: 'Basic',
  tagline: 'Everything to open a store',
  price: { month: 29, year: 290 },
  features: [
    { label: 'Online store and checkout', included: true },
    { label: 'Up to 2 staff accounts', included: true },
    { label: 'Discount codes', included: true },
    { label: 'Shipping labels', included: false },
  ],
  featured: false,
};

const GROW: Plan = {
  id: 'grow',
  name: 'Grow',
  tagline: 'For brands selling every day',
  price: { month: 79, year: 790 },
  features: [
    { label: 'Everything in Basic', included: true },
    { label: 'Up to 5 staff accounts', included: true },
    { label: 'Shipping labels', included: true },
    { label: 'Reports', included: true },
  ],
  featured: true,
};

const SCALE: Plan = {
  id: 'scale',
  name: 'Scale',
  tagline: 'For teams with several stores',
  price: { month: 299, year: 2990 },
  features: [
    { label: 'Everything in Grow', included: true },
    { label: 'Up to 15 staff accounts', included: true },
    { label: 'Custom reports', included: true },
    { label: 'Priority support', included: true },
  ],
  featured: false,
};

const PLANS: Plan[] = [BASIC, GROW, SCALE];

/** Stands in for your router's link component, such as Next's `Link`. */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

/** "{price} / {interval}": the amount from NumberValue, the interval a separate word. */
function Price({ value, interval }: { value: number; interval: Interval }): JSX.Element {
  return (
    <p className={`nzp-plan-card-price nzp-plan-card-price-${interval}`}>
      <Text render={<span />} variant="numeric-display">
        <NumberValue value={value} format={USD} />
      </Text>
      <Text render={<span />} tone="secondary">
        {interval === 'month' ? '/ month' : '/ year'}
      </Text>
    </p>
  );
}

/** A feature line: a check or a cross, and the words that say which for screen readers. */
function FeatureItem({ feature }: { feature: Feature }): JSX.Element {
  return (
    <li
      className={
        feature.included
          ? 'nzp-plan-card-feature'
          : 'nzp-plan-card-feature nzp-plan-card-feature-excluded'
      }
    >
      {feature.included ? <Check size={16} /> : <X size={16} />}
      <span>
        {feature.included ? null : <span className="nz-visually-hidden">Not included: </span>}
        {feature.label}
      </span>
    </li>
  );
}

/** One plan. Both prices are rendered; the row's interval control shows one (see the stylesheet). */
function PlanCard({ plan, intervals }: { plan: Plan; intervals: Interval[] }): JSX.Element {
  const titleId = `plan-card-${plan.id}-${intervals.length}`;
  return (
    <Card.Root
      className="nzp-plan-card"
      tone={plan.featured ? 'inverse' : 'surface'}
      elevation={plan.featured ? 1 : 0}
      render={<article aria-labelledby={titleId} />}
    >
      <div className="nzp-plan-card-header">
        <Card.Title id={titleId}>{plan.name}</Card.Title>
        {plan.featured ? (
          <Badge tone="brand" dot={false}>
            Popular
          </Badge>
        ) : null}
      </div>
      {intervals.map((interval) => (
        <Price key={interval} value={plan.price[interval]} interval={interval} />
      ))}
      <Text tone="secondary">{plan.tagline}</Text>
      <ul className="nzp-plan-card-features">
        {plan.features.map((feature) => (
          <FeatureItem key={feature.label} feature={feature} />
        ))}
      </ul>
      <Button
        className="nzp-plan-card-action"
        variant={plan.featured ? 'accent' : 'secondary'}
        fullWidth
        render={<Link href={`#start-${plan.id}`} />}
      >
        {`Start with ${plan.name}`}
      </Button>
    </Card.Root>
  );
}

/**
 * Figma 05's Plan Card (`7275:14284`), the Basic tier: the name, the price per month, a line
 * about it, the features and a link to start. A server composition: it ships no JavaScript.
 */
export function PlanCardExample(): JSX.Element {
  return <PlanCard plan={BASIC} intervals={['month']} />;
}

/**
 * A row of plans with a monthly or yearly price. The interval is a SegmentedControl, native radios,
 * and the row's stylesheet shows the prices of the checked one with `:has()`, so it works before
 * any JavaScript runs. An app that loads prices per interval reads the control's value instead
 * (`onValueChange` in a client component, or the form on the server) and renders one price.
 */
export function PlanCardRowExample(): JSX.Element {
  return (
    <Stack gap="5" className="nzp-plan-card-plans">
      <SegmentedControl.Root aria-label="Billing" name="plan-interval" defaultValue="month">
        <SegmentedControl.Item value="month">Monthly</SegmentedControl.Item>
        <SegmentedControl.Item value="year">Yearly</SegmentedControl.Item>
      </SegmentedControl.Root>
      <ul className="nzp-plan-card-row" aria-label="Plans">
        {PLANS.map((plan) => (
          <li key={plan.id}>
            <PlanCard plan={plan} intervals={['month', 'year']} />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

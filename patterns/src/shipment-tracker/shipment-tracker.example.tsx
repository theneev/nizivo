import type { JSX, ReactNode } from 'react';
import { House, Package, Receipt, Truck } from '@nizivo/icons';
import { Card } from '@nizivo/react/card';
import { Text } from '@nizivo/react/text';

type StepStatus = 'complete' | 'current' | 'upcoming';

/** The words a screen reader hears for each status; sighted users also see the node and the weight. */
const STATUS_TEXT: Record<StepStatus, string> = {
  complete: 'Completed',
  current: 'Current step',
  upcoming: 'Not started',
};

// An explicit locale and time zone, so the server and the browser print the same text. An app
// passes the customer's time zone.
const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

const DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

interface Step {
  label: string;
  icon: ReactNode;
}

/** The four steps: Ordered, Packed, Shipped and Delivered. */
const STEPS: Step[] = [
  { label: 'Ordered', icon: <Receipt /> },
  { label: 'Packed', icon: <Package /> },
  { label: 'Shipped', icon: <Truck /> },
  { label: 'Delivered', icon: <House /> },
];

interface Shipment {
  order: string;
  /** The index of the step the shipment is at. Earlier steps are complete, later ones upcoming. */
  current: number;
  /** When each step happened, as UTC instants, for the steps reached so far. */
  times: string[];
  /** The expected delivery day, a UTC instant. */
  expected: string;
}

/** One step: its node, its name, its status in words and, once reached, when it happened. */
function StepItem({
  step,
  status,
  at,
}: {
  step: Step;
  status: StepStatus;
  at?: string | undefined;
}): JSX.Element {
  return (
    <li
      className={`nzp-shipment-tracker-step nzp-shipment-tracker-step-${status}`}
      aria-current={status === 'current' ? 'step' : undefined}
    >
      <span className="nzp-shipment-tracker-node">{step.icon}</span>
      <span className="nzp-shipment-tracker-text">
        <Text render={<span />} variant={status === 'current' ? 'label-m-strong' : 'label-m'}>
          {step.label}
          <span className="nz-visually-hidden">{`, ${STATUS_TEXT[status]}`}</span>
        </Text>
        {at === undefined ? null : (
          <Text render={<time dateTime={at} />} tone="secondary">
            {WHEN.format(new Date(at))}
          </Text>
        )}
      </span>
    </li>
  );
}

/** A shipment's card: when it should arrive, then its steps as an ordered list. */
function ShipmentTracker({
  shipment,
  delivered,
}: {
  shipment: Shipment;
  delivered: boolean;
}): JSX.Element {
  const day = DAY.format(new Date(shipment.expected));
  return (
    <Card.Root
      className="nzp-shipment-tracker"
      render={<section aria-label={`Shipment for order #${shipment.order}`} />}
    >
      <div>
        <Card.Title>{delivered ? `Delivered ${day}` : `Arriving ${day}`}</Card.Title>
        <Text tone="secondary">{`Order #${shipment.order}`}</Text>
      </div>
      <ol className="nzp-shipment-tracker-steps" aria-label="Progress">
        {STEPS.map((step, index) => (
          <StepItem
            key={step.label}
            step={step}
            status={
              index < shipment.current
                ? 'complete'
                : index === shipment.current
                  ? 'current'
                  : 'upcoming'
            }
            at={shipment.times[index]}
          />
        ))}
      </ol>
    </Card.Root>
  );
}

/**
 * The Shipment Tracker at Step=Shipped. There is no Steps component, so the
 * tracker is an `<ol>` in the pattern's own stylesheet: the current step carries
 * `aria-current="step"`, and every step says its status in words. It is a column on a narrow
 * container and a row from 34rem, and its line follows the reading direction. A server composition:
 * it ships no JavaScript.
 */
export function ShipmentTrackerExample(): JSX.Element {
  return (
    <ShipmentTracker
      delivered={false}
      shipment={{
        order: '1042',
        current: 2,
        times: ['2026-10-14T09:12:00Z', '2026-10-14T15:40:00Z', '2026-10-15T08:05:00Z'],
        expected: '2026-10-17T00:00:00Z',
      }}
    />
  );
}

/** Step=Delivered: every step reached, the last one current, as the design draws it. */
export function ShipmentTrackerDeliveredExample(): JSX.Element {
  return (
    <ShipmentTracker
      delivered
      shipment={{
        order: '1038',
        current: 3,
        times: [
          '2026-10-09T11:20:00Z',
          '2026-10-09T16:02:00Z',
          '2026-10-10T07:45:00Z',
          '2026-10-12T13:31:00Z',
        ],
        expected: '2026-10-12T00:00:00Z',
      }}
    />
  );
}

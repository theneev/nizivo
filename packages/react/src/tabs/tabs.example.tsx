import type { JSX } from 'react';
import { Text } from '../text/index';
import { Textarea } from '../textarea/index';
import { Tabs } from './index';

const STATUSES = [
  ['all', 'All orders', 'Every order from the last 90 days.'],
  ['unfulfilled', 'Unfulfilled', 'Paid orders that still need to ship.'],
  ['unpaid', 'Unpaid', 'Orders waiting for a payment.'],
  ['open', 'Open', 'Orders with a pending return or exchange.'],
  ['archived', 'Archived', 'Orders you closed.'],
] as const;

/** Stand-ins for `@nizivo/icons` glyphs (16 px Lucide strokes). */
function Package(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}
function Truck(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6h12v10H2zM14 9h4l4 4v3h-8" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

/**
 * In-page views of one list. Arrow keys move between tabs and show each panel as they land on it;
 * Tab moves on into the panel. Only the selected panel is rendered, on the server too.
 */
export function TabsExample(): JSX.Element {
  return (
    <Tabs.Root defaultValue="all">
      <Tabs.List aria-label="Order status">
        {STATUSES.map(([value, label]) => (
          <Tabs.Tab key={value} value={value}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {STATUSES.map(([value, , text]) => (
        <Tabs.Panel key={value} value={value}>
          <Text tone="secondary">{text}</Text>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

/** A glyph before the label and a count after it; one tab is disabled and is skipped by the arrows. */
export function TabsStatesExample(): JSX.Element {
  return (
    <Tabs.Root defaultValue="to-pack">
      <Tabs.List aria-label="Fulfilment">
        <Tabs.Tab value="to-pack" icon={<Package />} count={12}>
          To pack
        </Tabs.Tab>
        <Tabs.Tab value="shipped" icon={<Truck />} count={48}>
          Shipped
        </Tabs.Tab>
        <Tabs.Tab value="returns" count={0} disabled>
          Returns
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="to-pack">
        <Text tone="secondary">12 orders are ready to pack.</Text>
      </Tabs.Panel>
      <Tabs.Panel value="shipped">
        <Text tone="secondary">48 orders shipped this week.</Text>
      </Tabs.Panel>
      <Tabs.Panel value="returns">
        <Text tone="secondary">No returns.</Text>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

/**
 * `activationMode="manual"`: arrow keys only move focus and Enter or Space selects, for panels that
 * are slow to show. `keepMounted` keeps a panel's state (here, a draft) while another tab is shown.
 */
export function TabsManualExample(): JSX.Element {
  return (
    <Tabs.Root defaultValue="write" activationMode="manual">
      <Tabs.List aria-label="Note">
        <Tabs.Tab value="write">Write</Tabs.Tab>
        <Tabs.Tab value="preview">Preview</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="write" keepMounted>
        <Textarea aria-label="Note text" defaultValue="Ship the blue mugs first." />
      </Tabs.Panel>
      <Tabs.Panel value="preview">
        <Text tone="secondary">The preview renders when this tab is selected.</Text>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

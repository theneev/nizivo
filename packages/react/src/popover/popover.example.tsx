import type { JSX } from 'react';
import { Button } from '../button/index';
import { Popover } from './index';

/**
 * A notifications-style popover from a composed Button: a title, a description, an action, and the
 * default close in the corner. Escape, an outside press or the close button close it, and focus
 * returns to the trigger. Opened, it focuses its first control (the corner close is skipped).
 */
export function PopoverExample(): JSX.Element {
  return (
    <Popover.Root>
      <Popover.Trigger render={<Button variant="secondary">Store status</Button>} />
      <Popover.Popup>
        <Popover.Title level={3}>Store is live</Popover.Title>
        <Popover.Close />
        <Popover.Description>
          Customers can see 42 products. Pause the store to hide them while you restock.
        </Popover.Description>
        <Button size="sm">Pause store</Button>
      </Popover.Popup>
    </Popover.Root>
  );
}

/**
 * Open on the server: closed overlays and server-rendered opens both emit no popup HTML (§12.2 SSR).
 * The popup opens after hydration, placed at the trigger's end.
 */
export function PopoverOpenExample(): JSX.Element {
  return (
    <Popover.Root defaultOpen>
      <Popover.Trigger render={<Button variant="secondary">Filters</Button>} />
      <Popover.Popup side="end" align="start" aria-label="Filters">
        <Popover.Description>No filters applied.</Popover.Description>
        <Popover.Close render={<Button size="sm">Done</Button>} />
      </Popover.Popup>
    </Popover.Root>
  );
}

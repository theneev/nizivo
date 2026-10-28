import type { JSX } from 'react';
import { Badge } from '../badge/index';
import { Button } from '../button/index';
import { Drawer } from './index';

/**
 * An order's details from the end edge, with a header, a body that
 * scrolls, and a footer whose two actions share its width. The bare `Drawer.Close` is the header's
 * close IconButton, named "Close".
 */
export function DrawerExample(): JSX.Element {
  return (
    <Drawer.Root>
      <Drawer.Trigger render={<Button variant="secondary">View order</Button>} />
      <Drawer.Popup>
        <Drawer.Header>
          <Drawer.Title>Order #1042</Drawer.Title>
          <Drawer.Description>
            <Badge tone="success">Paid</Badge> <Badge tone="warning">Unfulfilled</Badge>
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Close />
        <Drawer.Body>
          <p>2 × Stoneware mug, 1 × Linen tea towel.</p>
          <p>Ship to Asha Rao, 14 Lake Road, Pune.</p>
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
 * The bottom sheet, as AppShell's "More" sheet below 640 px: as tall as its content, the full width,
 * open on the server (closed and server-open overlays both emit no popup HTML, §12.2 SSR).
 */
export function DrawerSheetExample(): JSX.Element {
  return (
    <Drawer.Root defaultOpen>
      <Drawer.Trigger render={<Button variant="secondary">More</Button>} />
      <Drawer.Popup side="bottom">
        <Drawer.Header>
          <Drawer.Title>More</Drawer.Title>
        </Drawer.Header>
        <Drawer.Close />
        <Drawer.Body>
          <a href="#marketing">Marketing</a>
          <a href="#discounts">Discounts</a>
          <a href="#settings">Settings</a>
        </Drawer.Body>
      </Drawer.Popup>
    </Drawer.Root>
  );
}

import type { ComponentPropsWithRef, JSX } from 'react';
import { Button } from '../button/index';
import { IconButton } from '../icon-button/index';
import { Menu } from './index';

/** A stand-in for the `@nizivo/icons` ellipsis glyph (a 20 px Lucide stroke). */
function Ellipsis(): JSX.Element {
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
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

/** A stand-in for a router's link component, such as Next's `Link`. */
function StoreLink({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

/** The Figma Dropdown Menu: grouped actions with shortcuts; the destructive item sits last. */
export function MenuExample(): JSX.Element {
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="secondary">Actions</Button>} />
      <Menu.Popup>
        <Menu.Group>
          <Menu.GroupLabel>Product</Menu.GroupLabel>
          <Menu.Item shortcut="mod+e">Edit product</Menu.Item>
          <Menu.Item shortcut="mod+d">Duplicate product</Menu.Item>
          <Menu.Item shortcut="mod+p">Preview on store</Menu.Item>
          <Menu.Item shortcut="mod+l" disabled>
            Print barcode labels
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item tone="critical" shortcut="backspace">
          Delete product
        </Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
}

/** A row's "…" menu: an IconButton as the trigger, and link items that navigate. */
export function MenuRowActionsExample(): JSX.Element {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={<IconButton label="More actions" icon={<Ellipsis />} variant="tertiary" />}
      />
      <Menu.Popup align="end">
        <Menu.Item href="#order-1001">Open order</Menu.Item>
        <Menu.Item render={<StoreLink href="#order-1001-invoice" />}>Download invoice</Menu.Item>
        <Menu.Separator />
        <Menu.Item tone="critical">Cancel order</Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
}

/** Checkbox and radio items: the menu stays open while columns are toggled. */
export function MenuCheckboxExample(): JSX.Element {
  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="secondary">View</Button>} />
      <Menu.Popup>
        <Menu.Group>
          <Menu.GroupLabel>Columns</Menu.GroupLabel>
          <Menu.CheckboxItem defaultChecked>Status</Menu.CheckboxItem>
          <Menu.CheckboxItem defaultChecked>Inventory</Menu.CheckboxItem>
          <Menu.CheckboxItem>Vendor</Menu.CheckboxItem>
        </Menu.Group>
        <Menu.Separator />
        <Menu.RadioGroup defaultValue="comfortable">
          <Menu.GroupLabel>Density</Menu.GroupLabel>
          <Menu.RadioItem value="comfortable">Comfortable</Menu.RadioItem>
          <Menu.RadioItem value="compact">Compact</Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Popup>
    </Menu.Root>
  );
}

/** Open on the server: the trigger reports it, and the popup renders after hydration (§12.2 SSR). */
export function MenuOpenExample(): JSX.Element {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>Sort</Menu.Trigger>
      <Menu.Popup>
        <Menu.Item>Newest first</Menu.Item>
        <Menu.Item>Oldest first</Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  );
}

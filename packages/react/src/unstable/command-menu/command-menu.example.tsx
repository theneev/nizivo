import type { JSX } from 'react';
import { Button } from '../../button/index';
import { CommandMenu } from './index';

/** Stand-ins for `@nizivo/icons` glyphs. */
function Box(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
    </svg>
  );
}
function Sheet(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M6 3h12v18H6zM9 8h6M9 12h6" />
    </svg>
  );
}
function Plus(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Figma's command menu: products, an order and actions, filtered as you type. Press ⌘K (Ctrl+K
 * elsewhere) or the button; the arrow keys move, Enter opens the row, Escape clears the search and
 * then closes.
 */
export function CommandMenuExample(): JSX.Element {
  return (
    <CommandMenu.Root>
      <CommandMenu.Trigger render={<Button variant="secondary">Search…</Button>} />
      <CommandMenu.Popup>
        <CommandMenu.Input placeholder="Search products, orders and actions" />
        <CommandMenu.List>
          <CommandMenu.Group heading="Products">
            <CommandMenu.Item href="#stoneware-mug" icon={<Box />} kind="Product">
              Stoneware mug
            </CommandMenu.Item>
            <CommandMenu.Item href="#stoneware-bowls" icon={<Box />} kind="Product">
              Stoneware bowl set
            </CommandMenu.Item>
          </CommandMenu.Group>
          <CommandMenu.Group heading="Orders">
            <CommandMenu.Item href="#order-1042" icon={<Sheet />} kind="Order">
              #1042 · Stoneware mug ×2
            </CommandMenu.Item>
          </CommandMenu.Group>
          <CommandMenu.Group heading="Actions">
            <CommandMenu.Item href="#new-product" icon={<Plus />} kind="Action" shortcut="mod+n">
              Create product
            </CommandMenu.Item>
            <CommandMenu.Item
              href="#new-discount"
              icon={<Plus />}
              kind="Action"
              shortcut="mod+shift+d"
            >
              Create discount
            </CommandMenu.Item>
          </CommandMenu.Group>
        </CommandMenu.List>
        <CommandMenu.Footer />
      </CommandMenu.Popup>
    </CommandMenu.Root>
  );
}

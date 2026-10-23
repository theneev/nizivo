import type { ComponentPropsWithRef, CSSProperties, JSX, ReactNode } from 'react';
import { Sidebar, SidebarItem } from '../sidebar/index';
import { NavItem } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

/** Stands in for an `@nizivo/icons` glyph (20 px Lucide strokes, sized by the slot). */
function Glyph({ children }: { children: ReactNode }): JSX.Element {
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
      {children}
    </svg>
  );
}

const ICONS = {
  home: (
    <Glyph>
      <path d="M3 10.5 12 3l9 7.5V21H3z" />
      <path d="M9 21v-7h6v7" />
    </Glyph>
  ),
  orders: (
    <Glyph>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </Glyph>
  ),
  products: (
    <Glyph>
      <path d="m21 8-9-5-9 5v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </Glyph>
  ),
  customers: (
    <Glyph>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" />
    </Glyph>
  ),
  settings: (
    <Glyph>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Glyph>
  ),
};

/** A plain list: the items stack 4 px apart in a 216 px column, as in Figma's sidebar. */
const LIST: CSSProperties = {
  display: 'grid',
  gap: 4,
  inlineSize: 216,
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

/**
 * Sidebar destinations: a `<nav>` around a list of links. The current one is
 * `aria-current="page"`; a count follows the label and is part of the link's name.
 */
export function NavItemExample(): JSX.Element {
  return (
    <nav aria-label="Main">
      <ul style={LIST}>
        <li>
          <NavItem href="/" icon={ICONS.home}>
            Home
          </NavItem>
        </li>
        <li>
          <NavItem href="/orders" icon={ICONS.orders} count={12} current>
            Orders
          </NavItem>
        </li>
        <li>
          <NavItem href="/products" icon={ICONS.products}>
            Products
          </NavItem>
        </li>
        <li>
          <NavItem href="/customers" icon={ICONS.customers} count={3}>
            Customers
          </NavItem>
        </li>
      </ul>
    </nav>
  );
}

/** A router's link goes in through `render`; a disabled item is not a Tab stop and goes nowhere. */
export function NavItemRouterExample(): JSX.Element {
  return (
    <nav aria-label="Settings">
      <ul style={LIST}>
        <li>
          <NavItem render={<Link href="/settings/general" />} icon={ICONS.settings} current>
            General
          </NavItem>
        </li>
        <li>
          <NavItem render={<Link href="/settings/payments" />} icon={ICONS.orders}>
            Payments
          </NavItem>
        </li>
        <li>
          <NavItem icon={ICONS.customers} disabled>
            Staff accounts
          </NavItem>
        </li>
      </ul>
    </nav>
  );
}

/**
 * The icon rail: a Sidebar keeps it with `collapsed` (and draws it from 640 px to 1280 px on its
 * own). The labels and counts stay in the DOM as the links' names, and a count shows as a dot. In a
 * Sidebar, use `SidebarItem`: the same link, with a Tooltip that shows its label in the rail.
 */
export function NavItemCollapsedExample(): JSX.Element {
  return (
    <Sidebar.Root collapsed aria-label="Main, collapsed" style={{ blockSize: 'auto' }}>
      <Sidebar.Content>
        <SidebarItem href="/" icon={ICONS.home}>
          Home
        </SidebarItem>
        <SidebarItem href="/orders" icon={ICONS.orders} count={12} current>
          Orders
        </SidebarItem>
        <SidebarItem href="/customers" icon={ICONS.customers} count={3}>
          Customers
        </SidebarItem>
      </Sidebar.Content>
    </Sidebar.Root>
  );
}

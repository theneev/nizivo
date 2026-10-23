import type { JSX, ReactNode } from 'react';
import { NavItem } from '../nav-item/index';
import { Sidebar } from './index';

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
  analytics: (
    <Glyph>
      <path d="M3 3v18h18M8 17v-5M13 17V8M18 17v-9" />
    </Glyph>
  ),
  settings: (
    <Glyph>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Glyph>
  ),
};

function Destinations(): JSX.Element {
  return (
    <>
      <Sidebar.Header mark="M" title="Moss & Kiln" description="mossandkiln.com" />
      <Sidebar.Content>
        <NavItem href="/" icon={ICONS.home}>
          Home
        </NavItem>
        <NavItem href="/orders" icon={ICONS.orders} count={12} current>
          Orders
        </NavItem>
        <NavItem href="/products" icon={ICONS.products}>
          Products
        </NavItem>
        <NavItem href="/customers" icon={ICONS.customers}>
          Customers
        </NavItem>
        <NavItem href="/analytics" icon={ICONS.analytics}>
          Analytics
        </NavItem>
      </Sidebar.Content>
      <Sidebar.Footer>
        <NavItem href="/settings" icon={ICONS.settings}>
          Settings
        </NavItem>
      </Sidebar.Footer>
    </>
  );
}

/**
 * Figma's Sidebar, expanded: the store, the destinations and Settings at the foot. `collapsed={false}`
 * keeps it 264 px wide here; in an app it is 264 px from 1280 px and the icon rail from 640 px.
 * (The examples set `blockSize`; in a shell it is the viewport's height.)
 */
export function SidebarExample(): JSX.Element {
  return (
    <Sidebar.Root collapsed={false} style={{ blockSize: 480 }}>
      <Destinations />
    </Sidebar.Root>
  );
}

/**
 * The icon rail (Expanded=False): only the store's mark and the icons. The labels stay the links'
 * names, a count shows as a dot, and hovering or focusing an item shows its label beside it.
 */
export function SidebarRailExample(): JSX.Element {
  return (
    <Sidebar.Root collapsed style={{ blockSize: 480 }}>
      <Destinations />
    </Sidebar.Root>
  );
}

import type { JSX, ReactNode } from 'react';
import { NavItem } from '../nav-item/index';
import { MobileTabBar, MobileTabBarMore } from './index';

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

/**
 * Figma's Mobile Tab Bar: four destinations and More, links in a `<nav>` (each is a page, so not a
 * tablist). More opens the other destinations in a bottom sheet; following one closes it. Below
 * 640 px AppShell pins the bar to the bottom of the screen.
 */
export function MobileTabBarExample(): JSX.Element {
  return (
    <MobileTabBar.Root style={{ inlineSize: 390 }}>
      <MobileTabBar.Item href="/" icon={ICONS.home} current>
        Home
      </MobileTabBar.Item>
      <MobileTabBar.Item href="/orders" icon={ICONS.orders} count={12}>
        Orders
      </MobileTabBar.Item>
      <MobileTabBar.Item href="/products" icon={ICONS.products}>
        Products
      </MobileTabBar.Item>
      <MobileTabBar.Item href="/customers" icon={ICONS.customers}>
        Customers
      </MobileTabBar.Item>
      <MobileTabBarMore>
        <NavItem href="/analytics" icon={ICONS.analytics}>
          Analytics
        </NavItem>
        <NavItem href="/settings" icon={ICONS.settings}>
          Settings
        </NavItem>
      </MobileTabBarMore>
    </MobileTabBar.Root>
  );
}

/** A page from the sheet is shown: More draws the filled indicator, the sheet's link is current. */
export function MobileTabBarMoreCurrentExample(): JSX.Element {
  return (
    <MobileTabBar.Root style={{ inlineSize: 390 }}>
      <MobileTabBar.Item href="/" icon={ICONS.home}>
        Home
      </MobileTabBar.Item>
      <MobileTabBar.Item href="/orders" icon={ICONS.orders}>
        Orders
      </MobileTabBar.Item>
      <MobileTabBar.Item href="/products" icon={ICONS.products}>
        Products
      </MobileTabBar.Item>
      <MobileTabBar.Item href="/customers" icon={ICONS.customers}>
        Customers
      </MobileTabBar.Item>
      <MobileTabBarMore current>
        <NavItem href="/analytics" icon={ICONS.analytics} current>
          Analytics
        </NavItem>
        <NavItem href="/settings" icon={ICONS.settings}>
          Settings
        </NavItem>
      </MobileTabBarMore>
    </MobileTabBar.Root>
  );
}

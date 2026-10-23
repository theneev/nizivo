import type { JSX, ReactNode } from 'react';
import { Avatar } from '../avatar/index';
import { IconButton } from '../icon-button/index';
import { MobileTabBar, MobileTabBarMore } from '../mobile-tab-bar/index';
import { MobileTopBar } from '../mobile-top-bar/index';
import { NavItem } from '../nav-item/index';
import { PageHeader } from '../page-header/index';
import { SearchField } from '../search-field/index';
import { Sidebar } from '../sidebar/index';
import { TopBar } from '../top-bar/index';
import { AppShell } from './index';

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
  search: (
    <Glyph>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Glyph>
  ),
  bell: (
    <Glyph>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
    </Glyph>
  ),
};

/**
 * The shell of Figma's 08 pages: the Sidebar (the icon rail from 640 px, 264 px from 1280 px) and the
 * TopBar over the page; below 640 px the MobileTopBar and the MobileTabBar with its More sheet. The
 * server renders both sets and CSS shows one. AppShell owns `<main>` and the skip link to it, the
 * first Tab stop. (The example sets a height; in an app the shell fills the viewport.)
 */
export function AppShellExample(): JSX.Element {
  return (
    <AppShell
      style={{ minBlockSize: 480 }}
      sidebar={
        <Sidebar.Root style={{ blockSize: 480 }}>
          <Sidebar.Header mark="M" title="Moss & Kiln" description="mossandkiln.com" />
          <Sidebar.Content>
            <NavItem href="/" icon={ICONS.home} current>
              Home
            </NavItem>
            <NavItem href="/orders" icon={ICONS.orders} count={12}>
              Orders
            </NavItem>
            <NavItem href="/products" icon={ICONS.products}>
              Products
            </NavItem>
            <NavItem href="/customers" icon={ICONS.customers}>
              Customers
            </NavItem>
          </Sidebar.Content>
          <Sidebar.Footer>
            <NavItem href="/settings" icon={ICONS.settings}>
              Settings
            </NavItem>
          </Sidebar.Footer>
        </Sidebar.Root>
      }
      topBar={
        <TopBar
          title="Overview"
          search={
            <form method="get" action="/search">
              <SearchField
                name="q"
                placeholder="Search orders, products, customers"
                labels={{ label: 'Search the store' }}
              />
            </form>
          }
          actions={
            <>
              <IconButton icon={ICONS.bell} label="Notifications" variant="secondary" />
              <Avatar name="Maya Lindqvist" />
            </>
          }
        />
      }
      mobileTopBar={
        <MobileTopBar
          mark="M"
          title="Overview"
          actions={
            <>
              <IconButton icon={ICONS.search} label="Search" variant="tertiary" />
              <IconButton icon={ICONS.bell} label="Notifications" variant="tertiary" />
            </>
          }
        />
      }
      tabBar={
        <MobileTabBar.Root>
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
            <NavItem href="/settings" icon={ICONS.settings}>
              Settings
            </NavItem>
          </MobileTabBarMore>
        </MobileTabBar.Root>
      }
    >
      <PageHeader title="Good morning, Maya" />
    </AppShell>
  );
}

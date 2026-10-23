// v0.2 week 20 (M49): the overview dashboard inside the app shell, as 08's frames draw it. AppShell
// shows the Sidebar (the rail from 640 px, 264 px from 1280 px) and the TopBar on wide screens, and
// the MobileTopBar and the MobileTabBar with its More sheet below 640 px; the server renders both and
// CSS shows one. In a layout, so the shell stays mounted while the pages under it change. Client
// modules it adds: the SidebarItems' rail Tooltip, the SearchField, the IconButtons' tooltips, the
// MobileTabBar's inset island and More's Drawer; the bars and AppShell ship none.
import '@nizivo/react/css/app-shell.css';
import '@nizivo/react/css/drawer.css';
import '@nizivo/react/css/mobile-tab-bar.css';
import '@nizivo/react/css/mobile-top-bar.css';
import '@nizivo/react/css/nav-item.css';
import '@nizivo/react/css/search-field.css';
import '@nizivo/react/css/sidebar.css';
import '@nizivo/react/css/top-bar.css';
import { Bell } from '@nizivo/icons/bell';
import { ChartColumn } from '@nizivo/icons/chart-column';
import { House } from '@nizivo/icons/house';
import { Megaphone } from '@nizivo/icons/megaphone';
import { Package } from '@nizivo/icons/package';
import { Percent } from '@nizivo/icons/percent';
import { Search } from '@nizivo/icons/search';
import { Settings } from '@nizivo/icons/settings';
import { ShoppingBag } from '@nizivo/icons/shopping-bag';
import { Users } from '@nizivo/icons/users';
import { AppShell } from '@nizivo/react/app-shell';
import { Avatar } from '@nizivo/react/avatar';
import { IconButton } from '@nizivo/react/icon-button';
import { MobileTabBar, MobileTabBarMore } from '@nizivo/react/mobile-tab-bar';
import { MobileTopBar } from '@nizivo/react/mobile-top-bar';
import { NavItem } from '@nizivo/react/nav-item';
import { SearchField } from '@nizivo/react/search-field';
import { Sidebar, SidebarItem } from '@nizivo/react/sidebar';
import { TopBar } from '@nizivo/react/top-bar';

/** Figma Sidebar's destinations (figma/06 §6.2); the first four have a tab below 640 px. */
const TABS = [
  ['/dashboard', 'Home', House],
  ['/orders', 'Orders', ShoppingBag, 12],
  ['/products', 'Products', Package],
  ['/customers', 'Customers', Users],
];
const MORE = [
  ['/analytics', 'Analytics', ChartColumn],
  ['/marketing', 'Marketing', Megaphone],
  ['/discounts', 'Discounts', Percent],
];

export default function DashboardLayout({ children }) {
  return (
    <AppShell
      sidebar={
        <Sidebar.Root>
          <Sidebar.Header mark="M" title="Moss & Kiln" description="mossandkiln.com" />
          <Sidebar.Content>
            {[...TABS, ...MORE].map(([href, label, Icon, count]) => (
              <SidebarItem
                key={href}
                href={href}
                icon={<Icon />}
                count={count}
                current={href === '/dashboard'}
              >
                {label}
              </SidebarItem>
            ))}
          </Sidebar.Content>
          <Sidebar.Footer>
            <SidebarItem href="/settings" icon={<Settings />}>
              Settings
            </SidebarItem>
          </Sidebar.Footer>
        </Sidebar.Root>
      }
      topBar={
        <TopBar
          title="Overview"
          search={
            <form method="get" action="/dashboard">
              <SearchField
                name="q"
                placeholder="Search orders, products, customers"
                labels={{ label: 'Search the store' }}
              />
            </form>
          }
          actions={
            <>
              <IconButton icon={<Bell />} label="Notifications" variant="secondary" />
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
              <IconButton icon={<Search />} label="Search" variant="tertiary" />
              <IconButton icon={<Bell />} label="Notifications" variant="tertiary" />
            </>
          }
        />
      }
      tabBar={
        <MobileTabBar.Root>
          {TABS.map(([href, label, Icon, count]) => (
            <MobileTabBar.Item
              key={href}
              href={href}
              icon={<Icon />}
              count={count}
              current={href === '/dashboard'}
            >
              {label}
            </MobileTabBar.Item>
          ))}
          <MobileTabBarMore>
            {MORE.map(([href, label, Icon]) => (
              <NavItem key={href} href={href} icon={<Icon />}>
                {label}
              </NavItem>
            ))}
            <NavItem href="/settings" icon={<Settings />}>
              Settings
            </NavItem>
          </MobileTabBarMore>
        </MobileTabBar.Root>
      }
    >
      {children}
    </AppShell>
  );
}

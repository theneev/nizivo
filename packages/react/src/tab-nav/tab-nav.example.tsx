import type { ComponentPropsWithRef, JSX } from 'react';
import { TabNav } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

const STATUSES = [
  ['all', 'All orders'],
  ['unfulfilled', 'Unfulfilled'],
  ['unpaid', 'Unpaid'],
  ['open', 'Open'],
  ['archived', 'Archived'],
] as const;

/**
 * Status filters that are URLs: each one is a link, the current one is `aria-current="page"`. It is
 * server-rendered and needs no JavaScript; Tab moves between the links.
 */
export function TabNavExample(): JSX.Element {
  const status: string = 'unfulfilled';
  return (
    <TabNav.Root aria-label="Order status">
      {STATUSES.map(([value, label]) => (
        <TabNav.Link key={value} href={`?status=${value}`} current={value === status}>
          {label}
        </TabNav.Link>
      ))}
    </TabNav.Root>
  );
}

/** A router's link goes in through `render`; a count follows the label. */
export function TabNavRouterExample(): JSX.Element {
  return (
    <TabNav.Root aria-label="Customers">
      <TabNav.Link render={<Link href="?segment=vip" />} count={24} current>
        VIP
      </TabNav.Link>
      <TabNav.Link render={<Link href="?segment=all" />} count="1,280">
        All
      </TabNav.Link>
      <TabNav.Link render={<Link href="?segment=subscribers" />} count={311}>
        Subscribers
      </TabNav.Link>
      <TabNav.Link render={<Link href="?segment=at-risk" />} count={9}>
        At risk
      </TabNav.Link>
    </TabNav.Root>
  );
}

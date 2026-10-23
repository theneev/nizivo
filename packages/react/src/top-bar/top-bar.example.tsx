import type { JSX } from 'react';
import { Avatar } from '../avatar/index';
import { Breadcrumb } from '../breadcrumb/index';
import { IconButton } from '../icon-button/index';
import { SearchField } from '../search-field/index';
import { TopBar } from './index';

/** Stands in for an `@nizivo/icons` glyph (20 px Lucide strokes). */
function Bell(): JSX.Element {
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
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
    </svg>
  );
}

/**
 * Figma's Top Bar: the page's name, the search (a real input, M49) with its shortcut, then
 * notifications and the account. The title is text, not a heading: the page's PageHeader is the
 * `<h1>`.
 */
export function TopBarExample(): JSX.Element {
  return (
    <TopBar
      title="Overview"
      search={
        <form method="get" action="/search">
          <SearchField
            name="q"
            placeholder="Search orders, products, customers"
            shortcut="mod+k"
            labels={{ label: 'Search the store' }}
          />
        </form>
      }
      actions={
        <>
          <IconButton icon={<Bell />} label="Notifications, 3 unread" variant="secondary" />
          <Avatar name="Maya Lindqvist" />
        </>
      }
    />
  );
}

/** Deeper in the app, a Breadcrumb takes the title's place. */
export function TopBarBreadcrumbExample(): JSX.Element {
  return (
    <TopBar
      start={
        <Breadcrumb.Root>
          <Breadcrumb.Item href="/orders">Orders</Breadcrumb.Item>
          <Breadcrumb.Item current>#1042</Breadcrumb.Item>
        </Breadcrumb.Root>
      }
      actions={<Avatar name="Maya Lindqvist" />}
    />
  );
}

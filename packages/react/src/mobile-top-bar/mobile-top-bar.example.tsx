import type { JSX, ReactNode } from 'react';
import { IconButton } from '../icon-button/index';
import { MobileTopBar } from './index';

/** Stands in for an `@nizivo/icons` glyph (20 px Lucide strokes). */
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
 * The Mobile Top Bar: the store's mark, the page's name, then search and notifications as
 * IconButtons (the design draws bare icons). Below 640 px it takes the TopBar's place.
 */
export function MobileTopBarExample(): JSX.Element {
  return (
    <MobileTopBar
      mark="M"
      title="Overview"
      actions={
        <>
          <IconButton icon={ICONS.search} label="Search" variant="tertiary" />
          <IconButton icon={ICONS.bell} label="Notifications, 3 unread" variant="tertiary" />
        </>
      }
    />
  );
}

'use client';
// The CommandMenu's virtualized rows (D-dt): React Aria's Virtualizer and ListLayout around the
// Menu, in a chunk of their own that loads only for a `virtualized` list, so the search chunk every
// menu loads does not carry them (about 9 KB gzip). Behaviour only: no class names.
import type { JSX, ReactNode } from 'react';
import { ListLayout, Virtualizer } from 'react-aria-components';

/**
 * The rows' starting sizes, from command-menu.css (a 40 px row, a 30 px heading, 2 px apart, 8 px
 * around); the virtualizer measures each row it renders, so a taller one still fits.
 */
const LAYOUT = { estimatedRowHeight: 40, estimatedHeadingHeight: 30, gap: 2, padding: 8 };

/** Only the rows in view are in the DOM; the arrow keys still reach every row. */
export default function VirtualRows({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Virtualizer layout={ListLayout} layoutOptions={LAYOUT}>
      {children}
    </Virtualizer>
  );
}

'use client';
// A Sidebar destination with its rail tooltip (M52: "keep tooltip, because accessibility is
// important"): NavItem's link, made the trigger of a Tooltip that shows the label. The server cannot
// know whether the Sidebar is the icon rail (the viewport and a size container decide it), so the
// Tooltip is controlled and opens only while the item's label is out of the layout, which is what
// nav-item.css does in the rail. Expanded, the label is on screen and nothing opens.
import { useRef, useState, type ReactElement } from 'react';
import { NavItem, type NavItemProps } from '../nav-item/nav-item';
import { TooltipPopup, TooltipRoot, TooltipTrigger } from '../tooltip/tooltip.client';
import { cx } from '../_internal/cx';

export type SidebarItemProps = NavItemProps;

/** Whether `link`'s label is out of the layout: the rail's visually hidden label is 1 px wide. */
function inRail(link: HTMLElement | null): boolean {
  const label = link?.querySelector('.nz-nav-item-label');
  return label instanceof HTMLElement && label.getBoundingClientRect().width <= 1;
}

/** Writes `node` to every ref: the Tooltip trigger's (positioning), ours, and the consumer's. */
function allRefs(...refs: ReadonlyArray<unknown>): (node: HTMLAnchorElement | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (typeof ref === 'object' && ref !== null && 'current' in ref) {
        ref.current = node;
      }
    }
  };
}

/**
 * A `NavItem` for a Sidebar: the same link, with a Tooltip that names it while the Sidebar is the
 * icon rail (hover after the delay, keyboard focus at once; Escape closes it).
 */
export function SidebarItem({ className, ref, disabled, ...item }: SidebarItemProps): ReactElement {
  const link = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  return (
    // A disabled item is a span outside the Tab order with no hover: no tooltip either (§12.3)
    <TooltipRoot
      open={open}
      onOpenChange={(next) => setOpen(next && inRail(link.current))}
      disabled={disabled === true}
    >
      <TooltipTrigger
        render={(props) => (
          <NavItem
            {...item}
            {...triggerProps(props)}
            {...(disabled === undefined ? {} : { disabled })}
            data-slot="sidebar-item"
            className={cx('nz-sidebar-item', className)}
            ref={allRefs(props['ref'], link, ref)}
          />
        )}
      />
      <TooltipPopup side="end">{item.children}</TooltipPopup>
    </TooltipRoot>
  );
}

/**
 * Keeps the trigger's handlers. Drops what would make the DOM differ from NavItem's server path:
 * the trigger's class, slot, `data-open` and `tabIndex` (a link is focusable already), the ref
 * (merged above), and `aria-describedby`: the tooltip repeats the link's name, so describing the link
 * by it would say the label twice.
 */
function triggerProps(props: Record<string, unknown>): Record<string, unknown> {
  const {
    className: _class,
    'data-slot': _slot,
    'data-open': _open,
    'aria-describedby': _described,
    tabIndex: _tabIndex,
    ref: _ref,
    type: _type,
    ...kept
  } = props;
  return kept;
}

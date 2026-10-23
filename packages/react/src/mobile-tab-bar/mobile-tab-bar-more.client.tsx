'use client';
// MobileTabBar's fifth destination (M49, figma/08 §7.3: "More implies an overflow bottom sheet"):
// a button in the bar that opens the destinations without a tab in a bottom Drawer (modal: focus
// moves in and is trapped, Escape and an outside press close it, focus returns to the button).
// Following a link in the sheet closes it, as a route change does.
import { useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import {
  DrawerBody,
  DrawerClose,
  DrawerHeader,
  DrawerPopup,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '../drawer/drawer.client';
import type { DrawerTriggerProps } from '../drawer/drawer.contract';
import { cx } from '../_internal/cx';
import { EllipsisGlyph } from '../_internal/glyphs';

/** Strings this part renders (§16.4). */
export interface MobileTabBarMoreLabels {
  /** The button's label in the bar, and the sheet's title. @default 'More' */
  more: string;
  /** The sheet's close button. @default 'Close' */
  close: string;
}

export interface MobileTabBarMoreProps extends Omit<DrawerTriggerProps, 'render' | 'children'> {
  /**
   * The page being shown is one of the sheet's: draws the bar's filled indicator on More. It is a
   * button, so nothing is announced; the sheet's link carries `aria-current`. @default false
   */
  current?: boolean;
  /** The glyph in the bar. Defaults to the internal `ellipsis` (Lucide's). */
  icon?: ReactNode;
  /** The sheet's title, when it differs from the button's label. */
  heading?: ReactNode;
  labels?: Partial<MobileTabBarMoreLabels>;
  /** The sheet's content: the other destinations, usually `NavItem`s. */
  children: ReactNode;
}

export function MobileTabBarMore({
  current = false,
  icon,
  heading,
  labels,
  className,
  children,
  ...rest
}: MobileTabBarMoreProps): ReactElement {
  const [open, setOpen] = useState(false);
  const more = labels?.more ?? 'More';
  const closeOnLink = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target instanceof Element && event.target.closest('a[href]') !== null) setOpen(false);
  };
  return (
    <li className="nz-mobile-tab-bar-more" data-slot="mobile-tab-bar-more">
      <DrawerRoot open={open} onOpenChange={setOpen}>
        <DrawerTrigger
          {...rest}
          render={(props) => (
            <button
              {...props}
              type="button"
              data-slot="mobile-tab-bar-more-trigger"
              data-current={current ? '' : undefined}
              className={cx(
                'nz-mobile-tab-bar-more-trigger',
                typeof props['className'] === 'string' ? props['className'] : undefined,
                className,
              )}
            >
              <span
                className="nz-mobile-tab-bar-more-indicator"
                data-slot="mobile-tab-bar-more-indicator"
              >
                <span className="nz-mobile-tab-bar-icon" aria-hidden="true">
                  {icon ?? <EllipsisGlyph />}
                </span>
              </span>
              <span className="nz-mobile-tab-bar-more-label" data-slot="mobile-tab-bar-more-label">
                {more}
              </span>
            </button>
          )}
        />
        <DrawerPopup side="bottom">
          <DrawerHeader>
            <DrawerTitle>{heading ?? more}</DrawerTitle>
          </DrawerHeader>
          <DrawerClose labels={{ close: labels?.close ?? 'Close' }} />
          {/* hears clicks on the links inside, which Enter on a link also fires */}
          <DrawerBody className="nz-mobile-tab-bar-more-sheet" onClick={closeOnLink}>
            {children}
          </DrawerBody>
        </DrawerPopup>
      </DrawerRoot>
    </li>
  );
}

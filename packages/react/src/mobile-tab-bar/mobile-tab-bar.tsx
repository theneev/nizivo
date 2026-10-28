// NO directive: the bar and its links are server-rendered (ARCHITECTURE.md §9.5, "split"). Figma
// Mobile Tab Bar 7275:18747 (figma/08 §7): below 640 px, five destinations at the bottom of the
// screen in place of the Sidebar ("Below 640px the sidebar becomes a five-tab bar"). They are links
// in a <nav>, not tabs: each is a page, and the current one is aria-current="page". The fifth is
// usually MobileTabBarMore, the client part that opens the rest in a bottom sheet (M49).
//
// The bar renders one more client part, MobileTabBarInset: it writes the bar's height to
// --nz-layout-bottom-inset and sets data-nz-bottom-bar on <html> in a layout effect while the bar is
// shown, so StickyBar, the toast region and scroll padding clear it (§12.6; not :root:has(), which
// still matches a route that Activity hides).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { MobileTabBarInset } from './mobile-tab-bar-inset.client';

/** Strings this part renders (§16.4). */
export interface MobileTabBarLabels {
  /** The navigation landmark's name. @default 'Primary' */
  nav: string;
}

export interface MobileTabBarItemState {
  current: boolean;
}

export interface MobileTabBarRootProps extends ComponentPropsWithRef<'nav'> {
  labels?: Partial<MobileTabBarLabels>;
  /** The destinations: `MobileTabBar.Item`s, and `MobileTabBarMore` last. Five at most fit. */
  children: ReactNode;
}

export interface MobileTabBarItemProps extends Omit<ComponentPropsWithRef<'a'>, 'children'> {
  /** The page being shown: `aria-current="page"` and the filled indicator. @default false */
  current?: boolean;
  /** A decorative 20 px glyph in the indicator; it is `aria-hidden`. */
  icon: ReactNode;
  /**
   * A count on the icon's corner, such as open orders. It is part of the link's text, so it is
   * announced with the label: write it so it reads well there ("12 open").
   */
  count?: ReactNode;
  /** The router's link, for example `render={<Link href="/orders" />}`. It must render an `<a>`. */
  render?: RenderProp<MobileTabBarItemState>;
  /** The label under the icon. */
  children: ReactNode;
}

/** The `<nav>` and its list, with the bottom-inset island. */
export function MobileTabBarRoot({
  labels,
  className,
  children,
  ...rest
}: MobileTabBarRootProps): ReactElement {
  return (
    <nav
      aria-label={labels?.nav ?? 'Primary'}
      data-slot="mobile-tab-bar"
      {...rest}
      className={cx('nz-mobile-tab-bar', className)}
    >
      <ul className="nz-mobile-tab-bar-list" data-slot="mobile-tab-bar-list">
        {children}
      </ul>
      <MobileTabBarInset />
    </nav>
  );
}

/**
 * One destination: a list item around a link, with its icon in an indicator pill and its label
 * under it. Props other than `icon`, `count` and `current` go to the link.
 */
export function MobileTabBarItem({
  current = false,
  icon,
  count,
  render,
  className,
  children,
  ...rest
}: MobileTabBarItemProps): ReactElement {
  return (
    <li className="nz-mobile-tab-bar-item" data-slot="mobile-tab-bar-item">
      {renderElement(
        'a',
        render,
        { current },
        {
          'data-slot': 'mobile-tab-bar-link',
          ...rest,
          'aria-current': current ? 'page' : rest['aria-current'],
          className: cx('nz-mobile-tab-bar-link', className),
          children: (
            <>
              <span className="nz-mobile-tab-bar-indicator" data-slot="mobile-tab-bar-indicator">
                <span className="nz-mobile-tab-bar-icon" aria-hidden="true">
                  {icon}
                </span>
                {count != null && (
                  <span className="nz-mobile-tab-bar-count" data-slot="mobile-tab-bar-count">
                    {count}
                  </span>
                )}
              </span>
              <span className="nz-mobile-tab-bar-label" data-slot="mobile-tab-bar-label">
                {children}
              </span>
            </>
          ),
        },
      )}
    </li>
  );
}

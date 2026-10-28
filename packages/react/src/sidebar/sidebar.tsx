// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma Sidebar 7275:14732 (live
// 755:869, figma/06 §6.2): the store at the top, the destinations, Settings at the foot. Its width is
// the layout/sidebar token (M49: 264 px from 1280 px, the 72 px icon rail from 640 px, none below,
// where the MobileTabBar takes over), so the switch needs no script. The root is a size container:
// NavItem folds to the rail whenever its Sidebar is rail-narrow, whether the viewport or `collapsed`
// made it so, and the header keeps only its mark.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

type Empty = Record<string, never>;

/** Strings this part renders (§16.4). */
export interface SidebarLabels {
  /** The navigation landmark's name. @default 'Primary' */
  nav: string;
}

export interface SidebarRootProps extends ComponentPropsWithRef<'nav'> {
  /**
   * Overrides the width the viewport gives: `true` keeps the icon rail and `false` the full sidebar
   * at every width from 640 px, for an app with its own collapse control. Below 640 px the Sidebar
   * is not shown either way. Absent, it follows the viewport.
   */
  collapsed?: boolean;
  labels?: Partial<SidebarLabels>;
  render?: RenderProp<Empty>;
}

export interface SidebarHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** The store's mark, for example a square 32 px `Avatar`. The rail keeps it. */
  mark?: ReactNode;
  /** The store's name. In the rail it leaves the layout and stays in the DOM. */
  title?: ReactNode;
  /** A line under the name, such as the store's domain. */
  description?: ReactNode;
  /** A link to the store's home or a store switcher's trigger: `render={<a href="/" />}`. */
  render?: RenderProp<Empty>;
}

export interface SidebarContentProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Empty>;
}

export interface SidebarFooterProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Empty>;
}

/** The `<nav>` landmark around everything in the sidebar. */
export function SidebarRoot({
  collapsed,
  labels,
  render,
  className,
  ...rest
}: SidebarRootProps): ReactElement {
  return renderElement(
    'nav',
    render,
    {},
    {
      'aria-label': labels?.nav ?? 'Primary',
      'data-slot': 'sidebar',
      'data-collapsed': collapsed === true ? '' : undefined,
      'data-expanded': collapsed === false ? '' : undefined,
      ...rest,
      className: cx('nz-sidebar', className),
    },
  );
}

/** The store at the top: its mark, name and a line under it, on a card. */
export function SidebarHeader({
  mark,
  title,
  description,
  render,
  className,
  children,
  ...rest
}: SidebarHeaderProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'sidebar-header',
      ...rest,
      className: cx('nz-sidebar-header', className),
      children: (
        <>
          {mark != null && (
            <span className="nz-sidebar-header-mark" data-slot="sidebar-header-mark">
              {mark}
            </span>
          )}
          {(title != null || description != null) && (
            <span className="nz-sidebar-header-text" data-slot="sidebar-header-text">
              {title != null && (
                <span className="nz-sidebar-header-title" data-slot="sidebar-header-title">
                  {title}
                </span>
              )}
              {description != null && (
                <span
                  className="nz-sidebar-header-description"
                  data-slot="sidebar-header-description"
                >
                  {description}
                </span>
              )}
            </span>
          )}
          {children}
        </>
      ),
    },
  );
}

/** The destinations, `NavItem`s 4 px apart. */
export function SidebarContent({ render, className, ...rest }: SidebarContentProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'sidebar-content',
      ...rest,
      className: cx('nz-sidebar-content', className),
    },
  );
}

/** Pushed to the bottom, for Settings (an auto margin). */
export function SidebarFooter({ render, className, ...rest }: SidebarFooterProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'sidebar-footer',
      ...rest,
      className: cx('nz-sidebar-footer', className),
    },
  );
}

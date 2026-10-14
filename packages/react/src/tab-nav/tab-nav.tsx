// NO directive: TabNav is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5, risk R11; figma/13
// §4.5). The Tab visual on links: a <nav> landmark of <a> elements, the current one
// aria-current="page". It is navigation, not WAI-ARIA tabs: no tab roles, no arrow-key roving
// (Tab moves between links), and every view is a URL, so it works before hydration and with any
// router through `render={<Link href="…" />}`. In-page views with panels are Tabs.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface TabNavRootProps extends ComponentPropsWithRef<'nav'> {
  /**
   * Names the landmark ("Order status"). A page with more than one navigation landmark needs a
   * name on each.
   */
  'aria-label'?: string;
  /** Must render a navigation landmark (a `<nav>`, or an element with `role="navigation"`). */
  render?: RenderProp<Record<string, never>>;
}

export interface TabNavLinkState {
  current: boolean;
}

export interface TabNavLinkProps extends Omit<ComponentPropsWithRef<'a'>, 'children'> {
  /**
   * The link to the page being shown: sets `aria-current="page"` and draws the indicator. The page
   * knows its own route, so it says which link is current (a router's `usePathname` needs a client
   * component; a server page reads its params). @default false
   */
  current?: boolean;
  /** A decorative glyph before the label (16 px). */
  icon?: ReactNode;
  /** A count after the label, such as the number of orders in a status. */
  count?: ReactNode;
  /**
   * The router's link, for example `render={<Link href="/orders?status=open" />}` (Next.js, React
   * Router, TanStack Router, Astro's plain `<a>`). It must render an `<a>`.
   */
  render?: RenderProp<TabNavLinkState>;
  children: ReactNode;
}

export function TabNavRoot({ render, className, ...rest }: TabNavRootProps): ReactElement {
  return renderElement(
    'nav',
    render,
    {},
    { 'data-slot': 'tab-nav', ...rest, className: cx('nz-tab-nav', className) },
  );
}

export function TabNavLink({
  current = false,
  icon,
  count,
  render,
  className,
  children,
  ...rest
}: TabNavLinkProps): ReactElement {
  return renderElement(
    'a',
    render,
    { current },
    {
      'data-slot': 'tab-nav-link',
      // the strip scrolls and clips, so the focus outline is drawn inside the link (nz.base)
      'data-focus-inset': '',
      ...rest,
      'aria-current': current ? 'page' : rest['aria-current'],
      className: cx('nz-tab-nav-link', className),
      children: (
        <>
          {icon != null && (
            <span className="nz-tab-nav-icon" data-slot="tab-nav-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="nz-tab-nav-label" data-slot="tab-nav-label">
            <span className="nz-tab-nav-text">{children}</span>
            {/* the current weight's width, reserved so the current link never shifts the others */}
            <span className="nz-tab-nav-sizer" aria-hidden="true">
              {children}
            </span>
          </span>
          {count != null && (
            <span className="nz-tab-nav-count" data-slot="tab-nav-count">
              {count}
            </span>
          )}
        </>
      ),
    },
  );
}

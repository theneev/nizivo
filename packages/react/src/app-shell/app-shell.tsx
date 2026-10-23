// NO directive: zero client JS of its own under RSC (ARCHITECTURE.md §9.5). Figma's 08 frames lay a
// page out as a Sidebar beside a Top Bar over the content on desktop and tablet, and as a Mobile Top
// Bar over the content over a Mobile Tab Bar below 640 px ("Below 640px the sidebar becomes a
// five-tab bar and the top bar shrinks"; M49: the rail from 640 px, expanded from 1280 px). AppShell
// places the parts it is given and shows each at its widths with CSS only: the server renders both
// bars, and the hidden one is display: none, so it is out of the accessibility tree. It owns the
// page's <main> and a skip link to it. The MobileTabBar's own island sets the bottom inset.
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { cx } from '../_internal/cx';

/** Strings this part renders (§16.4). */
export interface AppShellLabels {
  /** The skip link, the first Tab stop. @default 'Skip to content' */
  skip: string;
}

export interface AppShellProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** A `Sidebar`, shown from 640 px. */
  sidebar?: ReactNode;
  /** A `TopBar`, shown from 640 px. */
  topBar?: ReactNode;
  /** A `MobileTopBar`, shown below 640 px. */
  mobileTopBar?: ReactNode;
  /** A `MobileTabBar`, pinned to the bottom below 640 px. */
  tabBar?: ReactNode;
  /** The `<main>` element's id, the skip link's target. Generated when absent. */
  mainId?: string;
  labels?: Partial<AppShellLabels>;
  /** The page, inside `<main>`. */
  children: ReactNode;
}

export function AppShell({
  sidebar,
  topBar,
  mobileTopBar,
  tabBar,
  mainId,
  labels,
  className,
  children,
  ...rest
}: AppShellProps): ReactElement {
  const generated = useId();
  // React's ids carry punctuation; the fragment keeps letters, digits, _ and -
  const main = mainId ?? `nz-main${generated.replaceAll(/[^\w-]/g, '')}`;
  return (
    <div data-slot="app-shell" {...rest} className={cx('nz-app-shell', className)}>
      <a className="nz-app-shell-skip" data-slot="app-shell-skip" href={`#${main}`}>
        {labels?.skip ?? 'Skip to content'}
      </a>
      {sidebar != null && (
        <div className="nz-app-shell-sidebar" data-slot="app-shell-sidebar">
          {sidebar}
        </div>
      )}
      <div className="nz-app-shell-frame" data-slot="app-shell-frame">
        {topBar != null && (
          <div className="nz-app-shell-top-bar" data-slot="app-shell-top-bar">
            {topBar}
          </div>
        )}
        {mobileTopBar != null && (
          <div className="nz-app-shell-mobile-top-bar" data-slot="app-shell-mobile-top-bar">
            {mobileTopBar}
          </div>
        )}
        <main id={main} tabIndex={-1} className="nz-app-shell-main" data-slot="app-shell-main">
          {children}
        </main>
      </div>
      {tabBar != null && (
        <div className="nz-app-shell-tab-bar" data-slot="app-shell-tab-bar">
          {tabBar}
        </div>
      )}
    </div>
  );
}

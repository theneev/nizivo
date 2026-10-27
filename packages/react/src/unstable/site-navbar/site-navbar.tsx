// NO directive: SiteNavbar is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp; Figma's
// Site Navbar 7392:80). A website's main navigation: the brand, the links and the actions. Bar runs
// full width with a bottom rule; Floating is a glass pill for over a hero. It is a <nav> named "Main",
// and the current page's link carries aria-current="page". Below 768 px the links move into a menu,
// a native <details> disclosure, so it needs no script. UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { MenuGlyph } from '../../_internal/glyphs';

/** One link. */
export interface SiteNavbarLink {
  label: ReactNode;
  href: string;
  /** The page this link goes to is the current one. */
  current?: boolean;
}

/** SiteNavbar's own strings (§16.4): serialisable, English defaults. */
export interface SiteNavbarLabels {
  /** The nav's name. @default 'Main' */
  label: string;
  /** The menu button's name, below 768 px. @default 'Menu' */
  menu: string;
}

export interface SiteNavbarProps extends Omit<ComponentPropsWithRef<'header'>, 'children'> {
  /** The logo, as a link home. */
  brand?: ReactNode;
  links: readonly SiteNavbarLink[];
  /** At the end: Sign in, Get started. */
  actions?: ReactNode;
  /** Figma "Style". @default 'bar' */
  variant?: 'bar' | 'floating';
  labels?: Partial<SiteNavbarLabels>;
  /** Must render a `<header>`. */
  render?: RenderProp<Record<string, never>>;
}

function List({ links }: { links: readonly SiteNavbarLink[] }): ReactElement {
  return (
    <ul className="nz-site-navbar-links">
      {links.map((link) => (
        <li key={link.href}>
          <a
            className="nz-site-navbar-link"
            data-slot="site-navbar-link"
            href={link.href}
            aria-current={link.current === true ? 'page' : undefined}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteNavbar({
  brand,
  links,
  actions,
  variant = 'bar',
  labels,
  render,
  className,
  ...rest
}: SiteNavbarProps): ReactElement {
  return renderElement(
    'header',
    render,
    {},
    {
      'data-slot': 'site-navbar',
      'data-variant': variant,
      ...rest,
      className: cx('nz-site-navbar', className),
      children: (
        <>
          {brand != null && <div className="nz-site-navbar-brand">{brand}</div>}
          <nav className="nz-site-navbar-nav" aria-label={labels?.label ?? 'Main'}>
            <div className="nz-site-navbar-wide">
              <List links={links} />
            </div>
            <details className="nz-site-navbar-narrow">
              <summary
                className="nz-site-navbar-menu"
                data-slot="site-navbar-menu"
                aria-label={labels?.menu ?? 'Menu'}
              >
                <MenuGlyph />
              </summary>
              <div className="nz-site-navbar-panel">
                <List links={links} />
              </div>
            </details>
          </nav>
          {actions != null && <div className="nz-site-navbar-actions">{actions}</div>}
        </>
      ),
    },
  );
}

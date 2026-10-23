// NO directive: NavItem is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5; Figma Nav Item
// 7275:14700, live 755:658, figma/06 §6.1). One sidebar destination: a native <a>, the current one
// aria-current="page", with any router's link through `render` (no router provider, so nothing forces
// 'use client'; inventory §3.6). Tab moves between items as between any links.
//
// Collapsed is not a prop. A Sidebar (not built yet) sets `data-collapsed` on its root when it folds
// to the icon rail, and nav-item.css reads it from any ancestor: the label and the count leave the
// layout but stay in the DOM, so the link keeps its accessible name, and the count shows as a dot.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';

export interface NavItemState {
  current: boolean;
  disabled: boolean;
}

export interface NavItemProps extends Omit<ComponentPropsWithRef<'a'>, 'children'> {
  /**
   * The destination being shown: sets `aria-current="page"` and draws the filled state (Figma
   * State=Active). The page knows its own route, so it says which item is current. @default false
   */
  current?: boolean;
  /** A decorative glyph before the label (20 px, Figma's Icon slot); it is `aria-hidden`. */
  icon?: ReactNode;
  /**
   * A count after the label, such as the number of open orders (Figma's Count). Absent, or `null`,
   * shows none. It is part of the link's text, so it is announced with the label.
   */
  count?: ReactNode;
  /**
   * Not available: renders a `<span role="link" aria-disabled="true">` with no `href`, so it is out
   * of the Tab order and cannot be followed. `render` is ignored. @default false
   */
  disabled?: boolean;
  /**
   * The router's link, for example `render={<Link href="/orders" />}` (Next.js, React Router,
   * TanStack Router). It must render an `<a>`.
   */
  render?: RenderProp<NavItemState>;
  /** The label (Figma's Label). It stays the accessible name in the collapsed rail. */
  children: ReactNode;
}

export function NavItem({
  current = false,
  icon,
  count,
  disabled = false,
  render,
  className,
  children,
  ...rest
}: NavItemProps): ReactElement {
  const content = (
    <>
      {icon != null && (
        <span className="nz-nav-item-icon" data-slot="nav-item-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="nz-nav-item-label" data-slot="nav-item-label">
        {children}
      </span>
      {count != null && (
        <span className="nz-nav-item-count" data-slot="nav-item-count">
          {count}
        </span>
      )}
    </>
  );
  if (disabled) {
    // Not an <a href>, so it is out of the Tab order and goes nowhere; it keeps the link role and its
    // name, marked disabled (an <a> without href has no role), as Pagination's ends do. Only the
    // global attributes carry over: the anchor-only ones (href, target, rel, download) are dropped.
    const { href: _href, target: _target, rel: _rel, download: _download, ...attributes } = rest;
    return (
      <span
        {...attributes}
        data-slot="nav-item"
        {...stateAttrs({ disabled: true })}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a disabled link: <a> needs href to be one
        role="link"
        aria-disabled="true"
        aria-current={current ? 'page' : rest['aria-current']}
        className={cx('nz-nav-item', className)}
      >
        {content}
      </span>
    );
  }
  return renderElement(
    'a',
    render,
    { current, disabled },
    {
      'data-slot': 'nav-item',
      ...rest,
      'aria-current': current ? 'page' : rest['aria-current'],
      className: cx('nz-nav-item', className),
      children: content,
    },
  );
}

// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma Top Bar 755:1031 (figma/06
// §6.8): the page's title at the start, the search, then alerts and the account at the end, over a
// border/subtle line. The title is not a heading: the page's PageHeader holds its one <h1>, so the
// bar does not repeat it as one. Each slot takes the app's own parts (a SearchField, an IconButton,
// an Avatar), which bring their own client code where they have any.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface TopBarProps extends Omit<ComponentPropsWithRef<'header'>, 'title' | 'children'> {
  /** The page's name, in Heading/H3's look. Not a heading element. */
  title?: ReactNode;
  /** In place of `title`, for example a Breadcrumb for a page deeper in the app. */
  start?: ReactNode;
  /** The search, usually a `SearchField` (M49: a real input). 360 px at most. */
  search?: ReactNode;
  /** At the end: the notifications IconButton, the account's Avatar or menu. */
  actions?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

/** The bar above the page on screens 640 px and wider (AppShell's `topBar`). */
export function TopBar({
  title,
  start,
  search,
  actions,
  render,
  className,
  ...rest
}: TopBarProps): ReactElement {
  return renderElement(
    'header',
    render,
    {},
    {
      'data-slot': 'top-bar',
      ...rest,
      className: cx('nz-top-bar', className),
      children: (
        <>
          <div className="nz-top-bar-start" data-slot="top-bar-start">
            {start ??
              (title != null && (
                <span className="nz-top-bar-title" data-slot="top-bar-title">
                  {title}
                </span>
              ))}
          </div>
          {search != null && (
            <div className="nz-top-bar-search" data-slot="top-bar-search">
              {search}
            </div>
          )}
          {actions != null && (
            <div className="nz-top-bar-actions" data-slot="top-bar-actions">
              {actions}
            </div>
          )}
        </>
      ),
    },
  );
}

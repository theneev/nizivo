// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma Mobile Top Bar (ghost
// 764:3397, figma/08 §8.1): below 640 px, the store's mark, the page's name, then search and alerts,
// over a border/subtle line. Figma draws the two as bare 20 px icons; here they are the app's
// IconButtons, 44 px under a coarse pointer. As in TopBar, the title is text, not a heading.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface MobileTopBarProps extends Omit<
  ComponentPropsWithRef<'header'>,
  'title' | 'children'
> {
  /** The page's name, in Heading/H4's look (Figma's Title). Not a heading element. */
  title?: ReactNode;
  /** The store's mark, drawn as Figma's 32 px Store mark: an initial, or a logo image that fills it. */
  mark?: ReactNode;
  /** In place of `mark`, for example a back link on a detail page. */
  leading?: ReactNode;
  /** At the end, usually a search IconButton and a notifications IconButton. */
  actions?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

/** The bar above the page below 640 px (AppShell's `mobileTopBar`). */
export function MobileTopBar({
  title,
  mark,
  leading,
  actions,
  render,
  className,
  ...rest
}: MobileTopBarProps): ReactElement {
  return renderElement(
    'header',
    render,
    {},
    {
      'data-slot': 'mobile-top-bar',
      ...rest,
      className: cx('nz-mobile-top-bar', className),
      children: (
        <>
          {leading ??
            (mark != null && (
              <span className="nz-mobile-top-bar-mark" data-slot="mobile-top-bar-mark">
                {mark}
              </span>
            ))}
          <span className="nz-mobile-top-bar-title" data-slot="mobile-top-bar-title">
            {title}
          </span>
          {actions != null && (
            <span className="nz-mobile-top-bar-actions" data-slot="mobile-top-bar-actions">
              {actions}
            </span>
          )}
        </>
      ),
    },
  );
}

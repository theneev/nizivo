// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma has no StickyBar component:
// the storefront's mobile screens (10) draw a "Sticky action bar" four times (figma/10 §4): a summary
// ("2 items" and the total) and one or two large Buttons on bg/surface with a border/subtle top
// edge. Its hard-coded 28 px bottom padding becomes the device's safe-area inset, and the bar stays
// above the shell's bottom chrome (--nz-layout-bottom-inset) and below overlays (--nz-z-sticky).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface StickyBarProps extends ComponentPropsWithRef<'div'> {
  /** At the start, for example "2 items" and the total. */
  summary?: ReactNode;
  /** The actions, usually one or two `size="lg"` Buttons, at the end. */
  children?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

/**
 * A bar that sticks to the bottom of the viewport while its section scrolls: the last child of the
 * page's content, or of the region it acts on.
 */
export function StickyBar({
  summary,
  render,
  className,
  children,
  ...rest
}: StickyBarProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'sticky-bar',
      ...rest,
      className: cx('nz-sticky-bar', className),
      children: (
        <>
          {summary != null && (
            <div className="nz-sticky-bar-summary" data-slot="sticky-bar-summary">
              {summary}
            </div>
          )}
          <div className="nz-sticky-bar-actions" data-slot="sticky-bar-actions">
            {children}
          </div>
        </>
      ),
    },
  );
}

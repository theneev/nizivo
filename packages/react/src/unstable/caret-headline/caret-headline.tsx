// NO directive: CaretHeadline is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dq; Figma's
// Caret Headline 7390:134). A headline ending in a blinking underscore caret, on for 530 ms and off
// for 530 ms (0.53 × --nz-duration-pulse). The caret is decoration, hidden from assistive technology;
// under Reduced motion it stays on. UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface CaretHeadlineProps extends ComponentPropsWithRef<'h1'> {
  /** The heading's level. @default 1 */
  level?: 1 | 2 | 3;
  /** Must render a heading. */
  render?: RenderProp<Record<string, never>>;
}

export function CaretHeadline({
  level = 1,
  render,
  className,
  children,
  ...rest
}: CaretHeadlineProps): ReactElement {
  return renderElement(
    `h${level}`,
    render,
    {},
    {
      'data-slot': 'caret-headline',
      ...rest,
      className: cx('nz-caret-headline', className),
      children: (
        <>
          {children}
          <span className="nz-caret-headline-caret" aria-hidden="true" />
        </>
      ),
    },
  );
}

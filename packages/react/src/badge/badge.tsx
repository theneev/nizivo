// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** The badge's colour, by status. `brand` is the only solid fill. */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'brand';

export interface BadgeState {
  tone: BadgeTone;
  dot: boolean;
}

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  /** @default 'neutral' */
  tone?: BadgeTone;
  /** A decorative status dot before the label. The label carries the meaning. @default true */
  dot?: boolean;
  /** Composition, for example `render={<a href="/orders?status=paid" />}`. */
  render?: RenderProp<BadgeState>;
}

export function Badge({
  tone = 'neutral',
  dot = true,
  render,
  className,
  children,
  ...rest
}: BadgeProps): ReactElement {
  return renderElement(
    'span',
    render,
    { tone, dot },
    {
      'data-slot': 'badge',
      'data-tone': tone,
      ...rest,
      className: cx('nz-badge', className),
      children: (
        <>
          {dot && <span className="nz-badge-dot" data-slot="badge-dot" aria-hidden="true" />}
          <span className="nz-badge-label" data-slot="badge-label">
            {children}
          </span>
        </>
      ),
    },
  );
}

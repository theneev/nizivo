// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** Figma "Shape": a text line, a block (media, a chart) or a circle (an avatar). */
export type SkeletonShape = 'line' | 'block' | 'circle';

export interface SkeletonState {
  shape: SkeletonShape;
}

export interface SkeletonProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** @default 'line' */
  shape?: SkeletonShape;
  render?: RenderProp<SkeletonState>;
}

/**
 * One placeholder block, always hidden from assistive technology. The region it stands in for sets
 * `aria-busy` and carries visually hidden "Loading …" text (§16.5). There is no `style` prop path:
 * size it with a class, or with `--nz-skeleton-width`, `--nz-skeleton-height` and `--nz-skeleton-radius`.
 */
export function Skeleton({
  shape = 'line',
  render,
  className,
  ...rest
}: SkeletonProps): ReactElement {
  return renderElement(
    'span',
    render,
    { shape },
    {
      'data-slot': 'skeleton',
      'data-shape': shape,
      ...rest,
      className: cx('nz-skeleton', className),
      'aria-hidden': true,
    },
  );
}

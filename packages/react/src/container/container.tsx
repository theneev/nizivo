// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface ContainerProps extends ComponentPropsWithRef<'div'> {
  /** Another element, for example `render={<main />}`. */
  render?: RenderProp<Record<string, never>>;
}

/**
 * Centres page content: at most `--nz-layout-content-max` wide (358, 976, 1280 px by viewport), with
 * the responsive page margin `--nz-grid-margin` (16, 24, 32 px) on both sides.
 */
export function Container({ render, className, ...rest }: ContainerProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'container',
      ...rest,
      className: cx('nz-container', className),
    },
  );
}

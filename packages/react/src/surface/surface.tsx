// NO directive: Surface is server-safe, 0 KB of client JS (ARCHITECTURE.md §13, §21.3). A panel of
// the page's surface colour; `material="glass"` makes it Figma's Nizivo/Surface/Glass style (a 24 px
// background blur behind a translucent bg/surface, as on the floating Site Navbar 7392:80 and the
// Lab's Glass card 7275:19634), for a panel over a photo, a shader or a busy page. Where the browser
// cannot blur the backdrop (Safari before 18), under reduced transparency and in forced colours it
// stays opaque, so its text keeps the surface's contrast.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export type SurfaceMaterial = 'solid' | 'glass';

export interface SurfaceState {
  material: SurfaceMaterial;
}

export interface SurfaceProps extends ComponentPropsWithRef<'div'> {
  /**
   * `solid`: bg/surface. `glass`: bg/surface at 72 % over a blurred backdrop, with a soft shadow;
   * opaque where the backdrop cannot be blurred, under reduced transparency and in forced colours.
   * @default 'solid'
   */
  material?: SurfaceMaterial;
  /** Any element: a `<section>`, a `<nav>`, a `<header>`. */
  render?: RenderProp<SurfaceState>;
}

export function Surface({
  material = 'solid',
  render,
  className,
  ...rest
}: SurfaceProps): ReactElement {
  return renderElement(
    'div',
    render,
    { material },
    {
      'data-slot': 'surface',
      'data-material': material,
      ...rest,
      className: cx('nz-surface', className),
    },
  );
}

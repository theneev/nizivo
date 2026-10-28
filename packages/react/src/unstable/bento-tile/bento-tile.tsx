// NO directive: BentoTile is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp; Figma's
// Bento Tile 7395:80). A showcase tile for a bento grid: a background (Figma's Aurora shader:
// `background={<ShaderSurface />}`, M89; without it CSS gradients; or a screenshot or photo) and a
// frosted caption card. The text always sits on the card, never on the background. `size` spans the
// tile on a 12-column grid: wide 8 by 1, square 4 by 1, tall 4 by 2. UNSTABLE: v0.6 is unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface BentoTileProps extends Omit<
  ComponentPropsWithRef<'article'>,
  'title' | 'children'
> {
  title: ReactNode;
  /** The title's level. @default 3 */
  headingLevel?: 2 | 3 | 4;
  description?: ReactNode;
  /** The tile's shape in the grid: wide, square or tall. @default 'square' */
  size?: 'wide' | 'square' | 'tall';
  /** Replaces the CSS background: UI, a photo. Decorative: hidden from assistive technology. */
  background?: ReactNode;
  /** Must render an `<article>`. */
  render?: RenderProp<Record<string, never>>;
}

export function BentoTile({
  title,
  headingLevel = 3,
  description,
  size = 'square',
  background,
  render,
  className,
  ...rest
}: BentoTileProps): ReactElement {
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'article',
    render,
    {},
    {
      'data-slot': 'bento-tile',
      'data-size': size,
      ...rest,
      className: cx('nz-bento-tile', className),
      children: (
        <>
          <span className="nz-bento-tile-background" aria-hidden="true">
            {background}
          </span>
          <div className="nz-bento-tile-caption">
            <Heading className="nz-bento-tile-title" data-slot="bento-tile-title">
              {title}
            </Heading>
            {description != null && <p className="nz-bento-tile-description">{description}</p>}
          </div>
        </>
      ),
    },
  );
}

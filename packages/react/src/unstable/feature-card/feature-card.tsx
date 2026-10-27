// NO directive: FeatureCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp; Figma's
// Feature Card 7392:129). One benefit in a grid of three: a decorative icon, the title (h3), a line
// or two and an optional link whose words make sense alone ("Learn about accessibility"). Plain on
// surfaces, Tinted to group, Inverse for emphasis. UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface FeatureCardProps extends Omit<ComponentPropsWithRef<'article'>, 'title'> {
  title: ReactNode;
  /** The title's level. @default 3 */
  headingLevel?: 2 | 3 | 4;
  /** A 20 px glyph for the tile; decorative. */
  icon?: ReactNode;
  /** After the text: a link, such as a Link. */
  action?: ReactNode;
  /** Figma "Style". @default 'plain' */
  variant?: 'plain' | 'tinted' | 'inverse';
  /** Must render an `<article>`. */
  render?: RenderProp<Record<string, never>>;
}

export function FeatureCard({
  title,
  headingLevel = 3,
  icon,
  action,
  variant = 'plain',
  render,
  className,
  children,
  ...rest
}: FeatureCardProps): ReactElement {
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'article',
    render,
    {},
    {
      'data-slot': 'feature-card',
      'data-variant': variant,
      ...rest,
      className: cx('nz-feature-card', className),
      children: (
        <>
          {icon != null && (
            <span className="nz-feature-card-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <Heading className="nz-feature-card-title" data-slot="feature-card-title">
            {title}
          </Heading>
          {children != null && (
            <div className="nz-feature-card-body" data-slot="feature-card-body">
              {children}
            </div>
          )}
          {action != null && <div className="nz-feature-card-action">{action}</div>}
        </>
      ),
    },
  );
}

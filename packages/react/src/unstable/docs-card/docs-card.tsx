// NO directive: DocsCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's
// Docs Card 7416:59). An entry point into an area of documentation: an icon, the title, a line on
// what is there and a real count ("114 components"). The whole card is one link, named by its title
// first. UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { ArrowUpRightGlyph } from '../../_internal/glyphs';

export interface DocsCardProps extends Omit<ComponentPropsWithRef<'a'>, 'title'> {
  /** The area: "Components". */
  title: ReactNode;
  /** What is there: "Every control with props, states, code and keyboard notes." */
  description?: ReactNode;
  /** A real count: "114 components". */
  meta?: ReactNode;
  /** A 20 px glyph for the tile, such as one from `@nizivo/icons`. */
  icon?: ReactNode;
  /** Must render an `<a>`, or a router link that renders one. */
  render?: RenderProp<Record<string, never>>;
}

export function DocsCard({
  title,
  description,
  meta,
  icon,
  render,
  className,
  ...rest
}: DocsCardProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'docs-card',
      ...rest,
      className: cx('nz-docs-card', className),
      children: (
        <>
          <span className="nz-docs-card-top" aria-hidden="true">
            <span className="nz-docs-card-icon">{icon}</span>
            <span className="nz-docs-card-arrow">
              <ArrowUpRightGlyph />
            </span>
          </span>
          <span className="nz-docs-card-title" data-slot="docs-card-title">
            {title}
          </span>
          {description != null && (
            <span className="nz-docs-card-description" data-slot="docs-card-description">
              {description}
            </span>
          )}
          {meta != null && (
            <span className="nz-docs-card-meta" data-slot="docs-card-meta">
              {meta}
            </span>
          )}
        </>
      ),
    },
  );
}

// NO directive: SectionHeader is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp;
// Figma's Section Header 7392:91). Opens a marketing section: the title, the section's heading (h2
// by default), and one supporting line, at most 720 px wide so a line stays under about 75
// characters. Start-aligned by default; centred for short, single-idea sections. No eyebrow labels.
// UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface SectionHeaderProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'title' | 'children'
> {
  title: ReactNode;
  /** The title's level. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4;
  /** The supporting line. */
  description?: ReactNode;
  /** Figma "Align". @default 'start' */
  align?: 'start' | 'center';
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function SectionHeader({
  title,
  headingLevel = 2,
  description,
  align = 'start',
  render,
  className,
  ...rest
}: SectionHeaderProps): ReactElement {
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'section-header',
      'data-variant': align,
      ...rest,
      className: cx('nz-section-header', className),
      children: (
        <>
          <Heading className="nz-section-header-title" data-slot="section-header-title">
            {title}
          </Heading>
          {description != null && (
            <p className="nz-section-header-description" data-slot="section-header-description">
              {description}
            </p>
          )}
        </>
      ),
    },
  );
}

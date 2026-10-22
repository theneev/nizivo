// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma has no PageHeader component:
// every 08 composition draws a "Page header" frame (figma/08 §4): the page's title, Heading/H1, then
// its controls on one row, centred; Pattern 2 adds a status Badge after the title. Below --nz-sm
// (40rem) the title takes Heading/H2's size (08's mobile frame swaps H1 for H2) and the actions
// wrap under it.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export type PageHeaderTitleLevel = 1 | 2;

export interface PageHeaderProps extends Omit<
  ComponentPropsWithRef<'header'>,
  'title' | 'children'
> {
  /** The page's title. One `<h1>` per page: the shell's top bar does not repeat it as a heading. */
  title: ReactNode;
  /** `2` for a page whose `<h1>` is elsewhere. Its look stays Heading/H1. @default 1 */
  level?: PageHeaderTitleLevel;
  /** Beside the title, for example a status `<Badge>`. */
  meta?: ReactNode;
  /** A line under the title, Body/M in `text/secondary`. */
  description?: ReactNode;
  /** The page's controls at the row's end, for example a SegmentedControl and Buttons. */
  actions?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

export function PageHeader({
  title,
  level = 1,
  meta,
  description,
  actions,
  render,
  className,
  ...rest
}: PageHeaderProps): ReactElement {
  const Title = `h${level}` as const;
  return renderElement(
    'header',
    render,
    {},
    {
      'data-slot': 'page-header',
      ...rest,
      className: cx('nz-page-header', className),
      children: (
        <>
          <div className="nz-page-header-content" data-slot="page-header-content">
            <div className="nz-page-header-heading" data-slot="page-header-heading">
              <Title className="nz-page-header-title" data-slot="page-header-title">
                {title}
              </Title>
              {meta != null && (
                <div className="nz-page-header-meta" data-slot="page-header-meta">
                  {meta}
                </div>
              )}
            </div>
            {description != null && (
              <p className="nz-page-header-description" data-slot="page-header-description">
                {description}
              </p>
            )}
          </div>
          {actions != null && (
            <div className="nz-page-header-actions" data-slot="page-header-actions">
              {actions}
            </div>
          )}
        </>
      ),
    },
  );
}

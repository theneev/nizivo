// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export type EmptyStateTitleLevel = 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'children'> {
  /** The headline. Its look is Heading/H3 at every `level`. */
  title: ReactNode;
  /** @default 2 */
  level?: EmptyStateTitleLevel;
  /** A render or illustration above the title, for example `<Image … />`. */
  media?: ReactNode;
  /** One action, for example `<Button variant="primary">Share your store</Button>`. */
  actions?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

/** Figma: "A render, a headline, one action. No paragraphs." */
export function EmptyState({
  title,
  level = 2,
  media,
  actions,
  render,
  className,
  ...rest
}: EmptyStateProps): ReactElement {
  const Title = `h${level}` as const;
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'empty-state',
      ...rest,
      className: cx('nz-empty-state', className),
      children: (
        <>
          {media != null && (
            <div className="nz-empty-state-media" data-slot="empty-state-media">
              {media}
            </div>
          )}
          <Title className="nz-empty-state-title" data-slot="empty-state-title">
            {title}
          </Title>
          {actions != null && (
            <div className="nz-empty-state-actions" data-slot="empty-state-actions">
              {actions}
            </div>
          )}
        </>
      ),
    },
  );
}

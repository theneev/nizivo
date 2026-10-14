// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import type { LayoutGap } from '../stack/stack';

/** Columns an item spans, or `'full'` for the whole row. Clamped to the columns available. */
export type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';

/**
 * A span per breakpoint: `base` is mobile first, `sm` applies from 40rem (`--nz-sm`) and `lg` from
 * 80rem (`--nz-lg`, provisional). An absent breakpoint keeps the one below it.
 */
export interface GridResponsiveSpan {
  base?: GridSpan;
  sm?: GridSpan;
  lg?: GridSpan;
}

export interface GridState {
  gap: LayoutGap | undefined;
}

export interface GridProps extends ComponentPropsWithRef<'div'> {
  /**
   * Space between tracks, as a `--nz-space-*` key. Absent, the responsive gutter
   * (`--nz-grid-gutter`: 16, 20, 24 px).
   */
  gap?: LayoutGap;
  render?: RenderProp<GridState>;
}

export interface GridItemState {
  span: GridSpan | GridResponsiveSpan | undefined;
}

export interface GridItemProps extends ComponentPropsWithRef<'div'> {
  /** @default 1 */
  span?: GridSpan | GridResponsiveSpan;
  render?: RenderProp<GridItemState>;
}

/** The page grid: `--nz-grid-columns` columns (4, 8, 12 by viewport). Items snap to spans. */
export function Grid({ gap, render, className, ...rest }: GridProps): ReactElement {
  return renderElement(
    'div',
    render,
    { gap },
    {
      'data-slot': 'grid',
      'data-gap': gap,
      ...rest,
      className: cx('nz-grid', className),
    },
  );
}

export function GridItem({ span, render, className, ...rest }: GridItemProps): ReactElement {
  const spans: GridResponsiveSpan =
    typeof span === 'object' ? span : span === undefined ? {} : { base: span };
  return renderElement(
    'div',
    render,
    { span },
    {
      'data-slot': 'grid-item',
      'data-span': attr(spans.base),
      'data-span-sm': attr(spans.sm),
      'data-span-lg': attr(spans.lg),
      ...rest,
      className: cx('nz-grid-item', className),
    },
  );
}

function attr(span: GridSpan | undefined): string | undefined {
  return span === undefined ? undefined : String(span);
}

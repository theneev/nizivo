// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Figma has no Split component: 08's
// pages draw "Columns" frames, a main column and an aside 24 apart (744 / 360 on the Overview, an
// 8 + 4 split of the 12-column grid; Settings puts a 232 px nav column first). The columns sit side
// by side while the main column keeps at least 60 % of the row and stack otherwise: a wrapping flex
// row, so the switch follows the Split's own width with no breakpoint and no script.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

type Empty = Record<string, never>;

/** `wide` is 08's 360 px aside (the 8 + 4 split); `narrow` its 232 px Settings nav column. */
export type SplitAsideWidth = 'narrow' | 'wide';

export interface SplitRootProps extends ComponentPropsWithRef<'div'> {
  /** The aside's width while the columns sit side by side. @default 'wide' */
  aside?: SplitAsideWidth;
  render?: RenderProp<Empty>;
}

export interface SplitMainProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Empty>;
}

export interface SplitAsideProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Empty>;
}

/**
 * The row. Put `Split.Main` and `Split.Aside` in reading order: the aside after the main column (an
 * Overview's side panel), or first (a Settings page's section nav). They stack in that order.
 */
export function SplitRoot({
  aside = 'wide',
  render,
  className,
  ...rest
}: SplitRootProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'split',
      'data-aside': aside,
      ...rest,
      className: cx('nz-split', className),
    },
  );
}

/** The main column: it takes the rest of the row. */
export function SplitMain({ render, className, ...rest }: SplitMainProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'split-main',
      ...rest,
      className: cx('nz-split-main', className),
    },
  );
}

/** The side column, `aside` wide; pass `render={<aside />}` for complementary content. */
export function SplitAside({ render, className, ...rest }: SplitAsideProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'split-aside',
      ...rest,
      className: cx('nz-split-aside', className),
    },
  );
}

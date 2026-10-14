// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import type { TextTone } from '../text/text';

/** The document outline level: `<h1>` to `<h6>`. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** The Figma display and heading text styles. */
export type HeadingVariant =
  | 'display-l'
  | 'display-m'
  | 'heading-h1'
  | 'heading-h2'
  | 'heading-h3'
  | 'heading-h4';

export interface HeadingState {
  level: HeadingLevel;
  variant: HeadingVariant;
  tone: TextTone | undefined;
}

export interface HeadingProps extends ComponentPropsWithRef<'h2'> {
  /** Required: the outline level decides the element, never the look. */
  level: HeadingLevel;
  /**
   * The text style, independent of `level` (a page title can be an `<h1>` drawn as Heading/H3).
   * @default the style named after the level, and `heading-h4` for levels 5 and 6 (Figma has no H5 or H6)
   */
  variant?: HeadingVariant;
  /** A `text/*` colour. Absent, the colour is inherited from the surface. */
  tone?: TextTone;
  render?: RenderProp<HeadingState>;
}

const VARIANT_OF_LEVEL: Record<HeadingLevel, HeadingVariant> = {
  1: 'heading-h1',
  2: 'heading-h2',
  3: 'heading-h3',
  4: 'heading-h4',
  5: 'heading-h4',
  6: 'heading-h4',
};

export function Heading({
  level,
  variant = VARIANT_OF_LEVEL[level],
  tone,
  render,
  className,
  ...rest
}: HeadingProps): ReactElement {
  return renderElement(
    `h${level}`,
    render,
    { level, variant, tone },
    {
      'data-slot': 'heading',
      'data-variant': variant,
      'data-tone': tone,
      ...rest,
      className: cx('nz-heading', className),
    },
  );
}

// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import type { Orientation } from '../contracts/state';
import { cx } from '../_internal/cx';

export interface SeparatorState {
  orientation: Orientation;
  decorative: boolean;
}

export interface SeparatorProps extends Omit<ComponentPropsWithRef<'hr'>, 'children'> {
  /** A vertical separator stretches to the height of its flex row. @default 'horizontal' */
  orientation?: Orientation;
  /**
   * Purely visual, hidden from assistive technology (`role="none"`): the Figma Divider default
   * (7370:95, M35). Pass `decorative={false}` for a separator that means something on its own, a
   * break between two groups a screen reader should hear (an `<hr>`'s implicit `separator` role,
   * with `aria-orientation` when vertical). @default true
   */
  decorative?: boolean;
  render?: RenderProp<SeparatorState>;
}

/**
 * An `<hr>`: a 1 px `border/subtle` line, Figma's Divider (7370:95). Decorative by default; spacing
 * comes first, a line only when spacing is not enough (the Figma doc).
 */
export function Separator({
  orientation = 'horizontal',
  decorative = true,
  render,
  className,
  ...rest
}: SeparatorProps): ReactElement {
  // Only a real <hr> has the implicit separator role.
  const native = render === undefined;
  return renderElement(
    'hr',
    render,
    { orientation, decorative },
    {
      'data-slot': 'separator',
      'data-orientation': orientation,
      ...rest,
      className: cx('nz-separator', className),
      role: decorative ? 'none' : native ? undefined : 'separator',
      'aria-orientation': !decorative && orientation === 'vertical' ? 'vertical' : undefined,
    },
  );
}

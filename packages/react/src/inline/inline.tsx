// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import type { LayoutGap } from '../stack/stack';

export interface InlineState {
  gap: LayoutGap | undefined;
}

export interface InlineProps extends ComponentPropsWithRef<'div'> {
  /** Space between children, on both axes when they wrap. Absent, there is none. */
  gap?: LayoutGap;
  /** Another element, for example `render={<ul />}` for a list. */
  render?: RenderProp<InlineState>;
}

/** Children in a row, centred on the cross axis, wrapping onto new lines when they do not fit. */
export function Inline({ gap, render, className, ...rest }: InlineProps): ReactElement {
  return renderElement(
    'div',
    render,
    { gap },
    {
      'data-slot': 'inline',
      'data-gap': gap,
      ...rest,
      className: cx('nz-inline', className),
    },
  );
}

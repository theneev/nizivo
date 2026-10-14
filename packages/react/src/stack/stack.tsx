// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** A `--nz-space-*` key: `'4'` is `--nz-space-4` (1rem), `'0-5'` is `--nz-space-0-5`. Token keys only. */
export type LayoutGap =
  | '0'
  | '0-5'
  | '1'
  | '1-5'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '8'
  | '10'
  | '12'
  | '16'
  | '20'
  | '24';

export interface StackState {
  gap: LayoutGap | undefined;
}

export interface StackProps extends ComponentPropsWithRef<'div'> {
  /** Space between children. Absent, there is none. */
  gap?: LayoutGap;
  /** Another element, for example `render={<ul />}` for a list. */
  render?: RenderProp<StackState>;
}

/** Children in a column. */
export function Stack({ gap, render, className, ...rest }: StackProps): ReactElement {
  return renderElement(
    'div',
    render,
    { gap },
    {
      'data-slot': 'stack',
      'data-gap': gap,
      ...rest,
      className: cx('nz-stack', className),
    },
  );
}

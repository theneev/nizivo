// Fixture: a frame whose props are a type alias of an intersection.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import type { RenderProp } from '../_shared/render';
import type { FrameLabels, FrameProps } from './frame.contract';

export const frameLabels: FrameLabels = { loading: 'Loading' };

export interface FrameState {
  pending: boolean;
}

export interface FrameAttributes extends Omit<
  ComponentPropsWithRef<'figure'>,
  'title' | 'children'
> {
  render?: RenderProp<FrameState>;
}

export type FrameElementProps = FrameProps & FrameAttributes;

/** What a part passes through: everything but `children` and what `Omitted` names. */
export type Passthrough<Omitted extends keyof FrameElementProps = never> = Omit<
  FrameElementProps,
  'children' | Omitted
>;

export function Frame({ title, children, ...rest }: FrameElementProps): ReactElement {
  return (
    <figure {...rest} className="nz-frame" data-slot="frame">
      <figcaption>{title}</figcaption>
      {children}
    </figure>
  );
}

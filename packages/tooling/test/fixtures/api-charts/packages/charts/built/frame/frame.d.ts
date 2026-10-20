import { RenderProp } from '../_shared/render.js';
import { FrameLabels, FrameProps } from './frame.contract.js';
import { ComponentPropsWithRef, ReactElement } from 'react';
//#region src/frame/frame.d.ts
export declare const frameLabels: FrameLabels;
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
export declare function Frame({ title, children, ...rest }: FrameElementProps): ReactElement;
//#endregion

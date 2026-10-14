import { RenderProp } from '../contracts/render.js';
import { ComponentPropsWithRef, ReactNode } from 'react';
//#region src/pane/pane.contract.d.ts
export interface PaneRootProps {
  /** 32 / 40 px. @default 'md' */
  size?: 'sm' | 'md';
  open?: boolean;
  children: ReactNode;
}
export interface PaneTriggerState {
  open: boolean;
  pressed: boolean;
}
export interface PaneTriggerProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'type'
> {
  /** Logical side of the panel; `data-side` on it is the resolved one, so it does not mirror this. */
  side?: 'start' | 'end';
  render?: RenderProp<PaneTriggerState>;
  children?: ReactNode;
}
//#endregion

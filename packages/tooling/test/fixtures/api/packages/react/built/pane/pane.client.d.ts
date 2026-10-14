import { PaneRootProps, PaneTriggerProps } from './pane.contract.js';
import { JSX } from 'react';
//#region src/pane/pane.client.d.ts
export declare function PaneRoot({ size, ...props }: PaneRootProps): JSX.Element;
export declare function PaneTrigger({
  className,
  render,
  children,
  ...rest
}: PaneTriggerProps): JSX.Element;
//#endregion

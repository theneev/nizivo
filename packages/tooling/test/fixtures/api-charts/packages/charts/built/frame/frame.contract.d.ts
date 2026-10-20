import { ReactNode } from 'react';
//#region src/frame/frame.contract.d.ts
interface FrameLabels {
  /** Shown while loading. @default 'Loading' */
  loading: string;
}
interface FrameProps {
  /** The caption. */
  title: ReactNode;
  legend?: ReactNode;
  labels?: Partial<FrameLabels>;
  children?: ReactNode;
}
//#endregion
export { FrameLabels, FrameProps };

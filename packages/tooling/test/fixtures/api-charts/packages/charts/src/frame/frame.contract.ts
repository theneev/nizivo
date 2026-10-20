// Fixture: the props every renderer relies on.
import type { ReactNode } from 'react';

export interface FrameLabels {
  /** Shown while loading. @default 'Loading' */
  loading: string;
}

export interface FrameProps {
  /** The caption. */
  title: ReactNode;
  legend?: ReactNode;
  labels?: Partial<FrameLabels>;
  children?: ReactNode;
}

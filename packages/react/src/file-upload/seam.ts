// The types between FileUpload and its engine, kept out of the public API: file-upload.contract.ts
// exports only what an app writes. NO directive.
import type { HTMLAttributes } from 'react';

/** What the component hands the engine for one render of the drop target. */
export interface FileUploadDropOptions {
  /** No drag is accepted, and no drag-over state is reported. */
  disabled: boolean;
  /** The files of one drop, in the order the platform gives them, and the drop target. */
  onDrop: (files: File[], target: HTMLElement) => void;
}

/** The drop target's props from the engine, and whether a drag is over it now. */
export interface FileUploadDropTarget {
  /** Spread on the drop target: drag handlers only, with no class and no data-* attributes. */
  dropProps: HTMLAttributes<HTMLElement>;
  /** A drag the target accepts is over it: the drag-over state. */
  isDropTarget: boolean;
}

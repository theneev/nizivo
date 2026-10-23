// Public, engine-free types and the FileUploadEngine interface (ARCHITECTURE.md §9.2, §9.5).
// NO directive. The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, ReactNode, RefObject } from 'react';
import type { FileUploadDropOptions, FileUploadDropTarget } from './seam';

/** Where an item's upload is. Absent on an item: chosen, not sent yet. */
export type FileUploadStatus = 'uploading' | 'complete' | 'error';

/** A file the component holds (and its input submits), with the id the component gave it. */
export interface FileUploadFile {
  /** Stays the same while the file is listed. Key your `items` and upload requests by it. */
  id: string;
  file: File;
}

/**
 * An item's upload state, from the app, which does the uploading. Matched to a held file by `id`;
 * an item whose id matches no held file is listed too, after the held files (a file uploaded
 * earlier, shown on an edit form).
 */
export interface FileUploadItem {
  id: string;
  /**
   * Shown in the list. Defaults to the held file's name; an item that matches no held file needs
   * one, or its `id` is shown.
   */
  name?: string;
  /** In bytes, shown beside the name. Defaults to the held file's size. */
  size?: number;
  status?: FileUploadStatus;
  /** 0 to 100 while `uploading`; absent, the bar is indeterminate. */
  progress?: number;
  /** The message while `status` is `error`. @default labels.failed */
  error?: string;
}

/** Why a chosen or dropped file was not added. */
export type FileUploadRejectionReason = 'type' | 'size' | 'count';

export interface FileUploadRejection {
  file: File;
  reason: FileUploadRejectionReason;
}

/**
 * Strings FileUpload renders (§16.4): serialisable, English defaults. `{name}` is a file's name,
 * `{max}` the formatted `maxSize`, `{browse}` where the browse word goes, `{complete}` and `{total}`
 * counts.
 */
export interface FileUploadLabels {
  /** The dropzone's line. @default 'Drop files here or {browse}' */
  prompt: string;
  /** The word that reads as the picker's button, in the brand colour. @default 'browse' */
  browse: string;
  /** Replaces the prompt while a drag with files is over the dropzone. @default 'Release to add files' */
  release: string;
  /** Replaces the prompt while an item is uploading. @default '{complete} of {total} uploaded' */
  summary: string;
  /** A file `accept` does not match. @default '{name} is not an accepted file type.' */
  wrongType: string;
  /** A file over `maxSize`. @default '{name} is larger than {max}.' */
  tooLarge: string;
  /** Without `multiple`, every file of a drop after the first. @default '{name} was not added: choose one file.' */
  tooMany: string;
  /** The list's accessible name. @default 'Chosen files' */
  list: string;
  /** Each item's remove button. @default 'Remove {name}' */
  remove: string;
  /** An item in error. @default 'Retry' */
  retry: string;
  /** An item uploading. @default 'Cancel' */
  cancel: string;
  /** An uploading item's progress bar. @default 'Uploading {name}' */
  uploading: string;
  /** A complete item's status. @default 'Uploaded' */
  complete: string;
  /** An item in error with no `error` text. @default 'Upload failed' */
  failed: string;
}

export interface FileUploadProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'children' | 'value' | 'defaultValue' | 'onChange' | 'accept' | 'multiple'
> {
  /**
   * The native `accept`: MIME types (`image/png`), wildcards (`image/*`) and extensions (`.pdf`),
   * comma-separated. The picker filters by it, and a dropped or picked file that does not match is
   * not added.
   */
  accept?: string;
  /** More than one file; each pick or drop adds to the list. Without it, a new file replaces the old. @default false */
  multiple?: boolean;
  /** Bytes. A larger file is not added. 1 MB is 1,000,000 bytes, as `{max}` is written. */
  maxSize?: number;
  /**
   * An error message is presented for this control (§8.3). Inside a Field, the Field sets it; an
   * explicit value here wins.
   */
  invalid?: boolean;
  /** The line under the prompt, such as "PNG, JPG or WebP, up to 20 MB". */
  hint?: ReactNode;
  /** Decorative mark above the prompt, such as your icon set's `upload` glyph (`aria-hidden`). */
  icon?: ReactNode;
  /**
   * Upload state per file, keyed by the ids `onFilesChange` gives. Leave it out when the form
   * submits the files itself.
   */
  items?: readonly FileUploadItem[];
  /** The held files changed: a pick, a drop, a remove, a cancel or the form's reset. Every held file, in order. */
  onFilesChange?: (files: FileUploadFile[]) => void;
  /** Files of a pick or drop that were not added; their messages show under the dropzone. */
  onReject?: (rejections: FileUploadRejection[]) => void;
  /** An item's remove button. A held file has already left the list and the input. */
  onRemove?: (id: string) => void;
  /** An item's retry button, on an item in `error`. */
  onRetry?: (id: string) => void;
  /** An item's cancel button, on an item `uploading`. The held file has already left the list. */
  onCancel?: (id: string) => void;
  labels?: Partial<FileUploadLabels>;
  /** BCP 47 tag for sizes. @default 'en-US' */
  locale?: string;
}

/**
 * The seam the react-aria adapter fills (`_engines/react-aria/file-upload.client.tsx`). The input,
 * the list, the checks and the DOM are Nizivo's; the engine supplies only the drop target.
 */
export interface FileUploadEngine {
  useDropTarget(
    options: FileUploadDropOptions,
    ref: RefObject<HTMLElement | null>,
  ): FileUploadDropTarget;
}

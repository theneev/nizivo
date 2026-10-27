// NO directive: FileItem is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's
// File Item 7396:153). An attachment or an upload: its name, then real progress (a ProgressBar, a
// native <progress> named after the file) with a cancel button, or a success mark, or a red edge,
// a written reason and a retry button. The state is never colour alone: each carries a word or a
// named control. Cancel and Retry are buttons that call `onCancel` and `onRetry`.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import {
  CircleCheckGlyph,
  CloseGlyph,
  FileTextGlyph,
  RefreshCwGlyph,
} from '../../_internal/glyphs';
import { formatLabel } from '../../i18n/format-label';
import { ProgressBar } from '../../progress-bar/index';

/** Figma "State". */
export type FileItemStatus = 'uploading' | 'done' | 'error';

/** FileItem's own strings (§16.4): serialisable, English defaults. */
export interface FileItemLabels {
  /** The progress bar's name: `{name}` is the file's. @default 'Uploading {name}' */
  progress: string;
  /** @default 'Cancel upload of {name}' */
  cancel: string;
  /** @default 'Retry upload of {name}' */
  retry: string;
  /** Read after a done file's name, for the success mark. @default 'Uploaded' */
  done: string;
}

export interface FileItemProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The file's name: "autumn-lookbook.pdf". */
  name: string;
  status: FileItemStatus;
  /** While uploading, from 0 to 100. */
  progress?: number;
  /** The line under the name: "2.4 of 3.9 MB · 62%", "3.9 MB · Uploaded", or why it failed. */
  detail?: ReactNode;
  /** Replaces the file-text mark, for example an image thumbnail. */
  icon?: ReactNode;
  onCancel?: () => void;
  onRetry?: () => void;
  /** BCP 47 tag for the progress value. @default 'en-US' */
  locale?: string;
  labels?: Partial<FileItemLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function FileItem({
  name,
  status,
  progress,
  detail,
  icon,
  onCancel,
  onRetry,
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: FileItemProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'file-item',
      'data-tone': status,
      ...rest,
      className: cx('nz-file-item', className),
      children: (
        <>
          <span className="nz-file-item-icon" aria-hidden="true">
            {icon ?? <FileTextGlyph />}
          </span>
          <span className="nz-file-item-text">
            <span className="nz-file-item-name" data-slot="file-item-name">
              {name}
            </span>
            {status === 'uploading' && (
              <ProgressBar
                className="nz-file-item-progress"
                value={progress ?? 0}
                showValue={false}
                locale={locale}
                aria-label={formatLabel(labels?.progress ?? 'Uploading {name}', { name })}
                {...(progress === undefined ? { indeterminate: true } : {})}
              />
            )}
            {detail != null && (
              <span className="nz-file-item-detail" data-slot="file-item-detail">
                {detail}
              </span>
            )}
          </span>
          {status === 'uploading' && (
            <button
              type="button"
              className="nz-file-item-action"
              data-slot="file-item-action"
              aria-label={formatLabel(labels?.cancel ?? 'Cancel upload of {name}', { name })}
              onClick={onCancel}
            >
              <CloseGlyph />
            </button>
          )}
          {status === 'done' && (
            <>
              <span className="nz-file-item-mark" aria-hidden="true">
                <CircleCheckGlyph />
              </span>
              <span className="nz-visually-hidden">{labels?.done ?? 'Uploaded'}</span>
            </>
          )}
          {status === 'error' && (
            <button
              type="button"
              className="nz-file-item-action"
              data-slot="file-item-action"
              aria-label={formatLabel(labels?.retry ?? 'Retry upload of {name}', { name })}
              onClick={onRetry}
            >
              <RefreshCwGlyph />
            </button>
          )}
        </>
      ),
    },
  );
}

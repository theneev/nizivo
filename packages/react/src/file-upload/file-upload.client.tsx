'use client';
// FileUpload (ARCHITECTURE.md §9.5 T2, §16.1): a native <input type="file"> that covers a dropzone,
// a list of the chosen files, and the app's upload state on each. Our own code on the platform,
// with React Aria's useDrop behind FileUploadEngine for the drop target only.
//
// The input is the form's source of truth. Its server HTML is a working file input: before
// hydration a click or a drop on the zone chooses files natively and a plain form submits them.
// Hydrated, the component holds the chosen files, checks each against `accept` and `maxSize`, and
// writes the list back into `input.files` after every pick, drop and remove, so the form still
// submits exactly what is listed. It never uploads: an app that sends files as they are chosen
// keys its requests by the ids `onFilesChange` gives and passes their state back as `items`.
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Button } from '../button/button';
import { mergeProps } from '../contracts/merge-props';
import { stateAttrs } from '../contracts/state';
import { useFieldControl } from '../field/field-scope.client';
import { iconButtonElement } from '../icon-button/icon-button-static';
import { InlineError } from '../inline-error/inline-error';
import { ProgressBar } from '../progress-bar/progress-bar';
import { cx } from '../_internal/cx';
import { joinIds } from '../_internal/field';
import { CircleCheckGlyph, CircleXGlyph, CloseGlyph } from '../_internal/glyphs';
import { useDropTarget } from './engine';
import type {
  FileUploadFile,
  FileUploadItem,
  FileUploadLabels,
  FileUploadProps,
  FileUploadRejection,
} from './file-upload.contract';

const LABELS: FileUploadLabels = {
  prompt: 'Drop files here or {browse}',
  browse: 'browse',
  release: 'Release to add files',
  summary: '{complete} of {total} uploaded',
  wrongType: '{name} is not an accepted file type.',
  tooLarge: '{name} is larger than {max}.',
  tooMany: '{name} was not added: choose one file.',
  list: 'Chosen files',
  remove: 'Remove {name}',
  retry: 'Retry',
  cancel: 'Cancel',
  uploading: 'Uploading {name}',
  complete: 'Uploaded',
  failed: 'Upload failed',
};

/** One row of the list: a held file with the app's state for it, or an item the app alone holds. */
interface Row {
  id: string;
  name: string;
  size: number | undefined;
  item: FileUploadItem | undefined;
  /** The component holds the file: removing it takes it out of the input too. */
  held: boolean;
}

/** Ids for held files: unique on the page, and never in the server HTML. */
let nextId = 0;

/**
 * `className` and `style` go on the root; every other input prop, `ref` included, goes on the
 * native `<input type="file">`.
 */
export function FileUpload({
  id,
  name,
  accept,
  multiple = false,
  maxSize,
  disabled,
  required,
  invalid,
  hint,
  icon,
  items,
  onFilesChange,
  onReject,
  onRemove,
  onRetry,
  onCancel,
  labels: labelsProp,
  locale = 'en-US',
  className,
  style,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedByProp,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: FileUploadProps): JSX.Element {
  const labels = { ...LABELS, ...labelsProp };
  const base = useId();
  const hintId = `${base}-hint`;
  const messagesId = `${base}-messages`;

  const [files, setFiles] = useState<FileUploadFile[]>([]);
  const [rejected, setRejected] = useState<FileUploadRejection[]>([]);
  const zone = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // A remove pressed: the row's index and the row count then, for the focus move after it.
  const refocus = useRef<{ index: number; count: number } | null>(null);

  const showHint = hint != null && hint !== false && hint !== '';
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    // As Input: an explicit `invalid` wins, else an aria-invalid a FieldStatic passed.
    invalid: invalid ?? (ariaInvalid === true || ariaInvalid === 'true' ? true : undefined),
    'aria-describedby': joinIds(
      describedByProp,
      showHint && hintId,
      rejected.length > 0 && messagesId,
    ),
    // A click on the Field's label focuses the zone; it does not open the picker.
    labelBehavior: 'focus',
  });

  const rows = listRows(files, items);
  const uploading = rows.filter((row) => row.item?.status === 'uploading').length;
  const pending = uploading > 0;
  const complete = rows.filter((row) => row.item?.status === 'complete').length;

  /** Writes the list into the input, then into state, then tells the app. */
  const commit = (element: HTMLInputElement | null, nextFiles: FileUploadFile[]): void => {
    write(element, nextFiles);
    setFiles(nextFiles);
    onFilesChange?.(nextFiles);
  };

  /** A pick or a drop: check each file, add the ones that pass, report the others. */
  const add = (incoming: readonly File[], element: HTMLInputElement | null): void => {
    const accepted: FileUploadFile[] = [];
    const refused: FileUploadRejection[] = [];
    for (const file of incoming) {
      const reason = !matches(file, accept)
        ? 'type'
        : maxSize !== undefined && file.size > maxSize
          ? 'size'
          : !multiple && accepted.length > 0
            ? 'count'
            : undefined;
      if (reason !== undefined) refused.push({ file, reason });
      else if (!files.some((held) => same(held.file, file))) {
        nextId += 1;
        accepted.push({ id: `${base}-${nextId}`, file });
      }
    }
    setRejected(refused);
    if (refused.length > 0) onReject?.(refused);
    if (accepted.length > 0) commit(element, multiple ? [...files, ...accepted] : accepted);
    // Nothing new: the input may hold a refused pick, so it gets the list back.
    else write(element, files);
  };

  const { dropProps, isDropTarget } = useDropTarget(
    { disabled: field.disabled, onDrop: (dropped, target) => add(dropped, inputIn(target)) },
    zone,
  );

  // Files chosen before hydration are in the input already: adopt them, checked as any pick is.
  const adopt = useEffectEvent((element: HTMLInputElement) => {
    if (element.files !== null && element.files.length > 0) add([...element.files], element);
  });
  useLayoutEffect(() => {
    const element = fileInputOf(zone.current);
    if (element !== null) adopt(element);
  }, []);

  // The form's reset empties the input itself; the list follows.
  useEffect(() => {
    const form = fileInputOf(zone.current)?.form;
    if (form == null) return undefined;
    const onReset = (): void => {
      setFiles([]);
      setRejected([]);
      onFilesChange?.([]);
    };
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [onFilesChange]);

  // After a remove, focus goes to the row that took its place, else the one before, else the input;
  // only when the list did shrink (an app may keep an item it alone holds).
  const count = rows.length;
  useLayoutEffect(() => {
    const removed = refocus.current;
    refocus.current = null;
    if (removed === null || count >= removed.count) return;
    const buttons = [...(list.current?.children ?? [])].map((row) => row.querySelector('button'));
    const target =
      buttons[Math.min(removed.index, buttons.length - 1)] ?? fileInputOf(zone.current);
    target?.focus();
  });

  const drop = (row: Row, index: number, event: MouseEvent<HTMLElement>): void => {
    refocus.current = { index, count };
    if (row.held) {
      commit(
        inputIn(event.currentTarget),
        files.filter((entry) => entry.id !== row.id),
      );
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    // A cancelled picker can fire `change` with no files: keep the list.
    const chosen = [...(event.currentTarget.files ?? [])];
    if (chosen.length > 0) add(chosen, event.currentTarget);
    else write(event.currentTarget, files);
  };

  const prompt = isDropTarget
    ? labels.release
    : pending
      ? fill(labels.summary, { complete: String(complete), total: String(rows.length) })
      : browseLine(labels.prompt, labels.browse);
  const invalidShown = field.invalid || rejected.length > 0;
  const removeLabel = (row: Row): string => fill(labels.remove, { name: row.name });

  return (
    <div
      className={cx('nz-file-upload', className)}
      data-slot="file-upload"
      {...stateAttrs({ disabled: field.disabled, invalid: invalidShown, pending })}
      style={style}
    >
      <div
        {...dropProps}
        ref={zone}
        className="nz-file-upload-dropzone"
        data-slot="file-upload-dropzone"
        data-drag-over={isDropTarget ? '' : undefined}
        {...stateAttrs({ disabled: field.disabled, invalid: invalidShown })}
        // the whole zone is inactive, its prompt included: WCAG 1.4.3 exempts inactive components,
        // and this is how assistive technology and axe know the prompt belongs to one
        aria-disabled={field.disabled ? true : undefined}
      >
        {/* consumer handlers run first; a prevented event skips the Field's */}
        <input
          {...mergeProps(field.controlProps, rest)}
          onChange={onChange}
          type="file"
          className="nz-file-upload-input"
          data-slot="file-upload-input"
          accept={accept}
          multiple={multiple}
          // A held file, or an item the app holds, meets `required`; the input alone may be empty.
          required={field.required && rows.length === 0 ? true : undefined}
          // Named by the Field's label, else by the idle prompt: the shown line changes while a
          // drag is over the zone and while uploading, and a control's name should not.
          aria-label={
            ariaLabel ??
            (ariaLabelledBy === undefined && field.labelledBy === undefined
              ? fill(labels.prompt, { browse: labels.browse })
              : undefined)
          }
          aria-labelledby={ariaLabelledBy}
        />
        {icon != null && (
          <span className="nz-file-upload-icon" data-slot="file-upload-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="nz-file-upload-prompt" data-slot="file-upload-prompt">
          {prompt}
        </span>
        {showHint && (
          <span className="nz-file-upload-hint" data-slot="file-upload-hint" id={hintId}>
            {hint}
          </span>
        )}
      </div>
      {/* In the server HTML and empty, so a rejection is spoken when it appears. */}
      <div
        className="nz-file-upload-messages"
        data-slot="file-upload-messages"
        id={messagesId}
        aria-live="polite"
      >
        {rejected.map(({ file, reason }) => (
          <InlineError key={`${reason}-${file.name}-${file.size}-${file.lastModified}`}>
            {rejection(labels, reason, file.name, maxSize, locale)}
          </InlineError>
        ))}
      </div>
      {rows.length > 0 && (
        <ul
          ref={list}
          className="nz-file-upload-list"
          data-slot="file-upload-list"
          aria-label={labels.list}
        >
          {rows.map((row, index) => {
            const status = row.item?.status;
            const nameId = `${base}-name-${row.id}`;
            return (
              <li
                key={row.id}
                className="nz-file-upload-item"
                data-slot="file-upload-item"
                {...stateAttrs({ pending: status === 'uploading', error: status === 'error' })}
              >
                <span
                  className="nz-file-upload-item-name"
                  data-slot="file-upload-item-name"
                  id={nameId}
                >
                  {row.name}
                </span>
                <span className="nz-file-upload-item-status" data-slot="file-upload-item-status">
                  {row.size !== undefined && (
                    <span className="nz-file-upload-item-size" data-slot="file-upload-item-size">
                      {formatBytes(row.size, locale)}
                    </span>
                  )}
                  {itemStatus(row, labels)}
                </span>
                <span className="nz-file-upload-item-actions" data-slot="file-upload-item-actions">
                  {status === 'error' && (
                    <Button
                      variant="tertiary"
                      size="sm"
                      aria-describedby={nameId}
                      disabled={field.disabled}
                      onClick={() => onRetry?.(row.id)}
                    >
                      {labels.retry}
                    </Button>
                  )}
                  {status === 'uploading' ? (
                    <Button
                      variant="tertiary"
                      size="sm"
                      aria-describedby={nameId}
                      disabled={field.disabled}
                      onClick={(event) => {
                        drop(row, index, event);
                        onCancel?.(row.id);
                      }}
                    >
                      {labels.cancel}
                    </Button>
                  ) : (
                    <RemoveButton
                      label={removeLabel(row)}
                      disabled={field.disabled}
                      onClick={(event) => {
                        drop(row, index, event);
                        onRemove?.(row.id);
                      }}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** IconButton's element with no tooltip, as Toast's close button: the row's name is visible. */
function RemoveButton(props: {
  label: string;
  disabled: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}): JSX.Element {
  return iconButtonElement({
    label: props.label,
    icon: <CloseGlyph />,
    variant: 'tertiary',
    size: 'sm',
    disabled: props.disabled,
    onClick: props.onClick,
  });
}

/** The file input of the FileUpload that holds `element`. */
function inputIn(element: Element): HTMLInputElement | null {
  return fileInputOf(element.closest('[data-slot="file-upload"]'));
}

function fileInputOf(scope: ParentNode | null): HTMLInputElement | null {
  return scope?.querySelector<HTMLInputElement>('[data-slot="file-upload-input"]') ?? null;
}

/** The held files in order, each with its item, then the items that match no held file. */
function listRows(
  files: readonly FileUploadFile[],
  items: readonly FileUploadItem[] | undefined,
): Row[] {
  const byId = new Map((items ?? []).map((item) => [item.id, item]));
  const rows: Row[] = files.map(({ id, file }) => {
    const item = byId.get(id);
    byId.delete(id);
    return { id, name: item?.name ?? file.name, size: item?.size ?? file.size, item, held: true };
  });
  for (const item of byId.values()) {
    rows.push({ id: item.id, name: item.name ?? item.id, size: item.size, item, held: false });
  }
  return rows;
}

function itemStatus(row: Row, labels: FileUploadLabels): ReactNode {
  const item = row.item;
  switch (item?.status) {
    case 'uploading':
      return (
        <ProgressBar
          value={item.progress ?? 0}
          indeterminate={item.progress === undefined}
          showValue={false}
          aria-label={fill(labels.uploading, { name: row.name })}
        />
      );
    case 'complete':
      return (
        <span className="nz-file-upload-item-complete" data-slot="file-upload-item-complete">
          <CircleCheckGlyph />
          {labels.complete}
        </span>
      );
    case 'error':
      return (
        <span className="nz-file-upload-item-error" data-slot="file-upload-item-error">
          <CircleXGlyph />
          {item.error ?? labels.failed}
        </span>
      );
    default:
      return null;
  }
}

function rejection(
  labels: FileUploadLabels,
  reason: FileUploadRejection['reason'],
  name: string,
  maxSize: number | undefined,
  locale: string,
): string {
  if (reason === 'type') return fill(labels.wrongType, { name });
  if (reason === 'count') return fill(labels.tooMany, { name });
  return fill(labels.tooLarge, { name, max: formatBytes(maxSize ?? 0, locale) });
}

/** The prompt with the browse word in its own span, where `{browse}` is (at the end if absent). */
function browseLine(template: string, browse: string): ReactNode {
  const at = template.indexOf('{browse}');
  const word = (
    <span className="nz-file-upload-browse" data-slot="file-upload-browse">
      {browse}
    </span>
  );
  if (at === -1) return template;
  return (
    <>
      {template.slice(0, at)}
      {word}
      {template.slice(at + '{browse}'.length)}
    </>
  );
}

function fill(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) out = out.replaceAll(`{${key}}`, value);
  return out;
}

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;

/** Decimal units (1 MB = 1,000,000 bytes), as macOS and the `maxSize` docs write them. */
function formatBytes(bytes: number, locale: string): string {
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: unit === 0 ? 'long' : 'short',
    maximumFractionDigits: unit > 0 && value < 10 ? 1 : 0,
  }).format(value);
}

/** The native `accept` rule: a MIME type, a `type/*` wildcard or a `.ext`, any of them. */
function matches(file: File, accept: string | undefined): boolean {
  const rules = (accept ?? '')
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter((rule) => rule !== '');
  if (rules.length === 0) return true;
  const fileName = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) =>
    rule.startsWith('.')
      ? fileName.endsWith(rule)
      : rule.endsWith('/*')
        ? type.startsWith(rule.slice(0, -1))
        : type === rule,
  );
}

function same(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

/**
 * Puts the held files in the input, as a FileList (the only kind `input.files` takes), and fires
 * `input` so a Field withdraws a "choose a file" message. Not `change`: React's onChange on a file
 * input is the native `change`, which would run the pick handler again.
 */
function write(element: HTMLInputElement | null, files: readonly FileUploadFile[]): void {
  if (element === null) return;
  const transfer = new DataTransfer();
  for (const { file } of files) transfer.items.add(file);
  element.files = transfer.files;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

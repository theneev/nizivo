// FileUpload in a real engine (ARCHITECTURE.md §9.5 T2, §16.1): the native input chooses files
// before hydration and its form submits them; hydrated, a pick or a drop is checked against
// `accept` and `maxSize`, the list's actions take files out of the input, and the form submits
// exactly what is listed. The app's upload state comes back through `items`.
//
// Drops are DragEvents with a script-made DataTransfer. Its `effectAllowed` is read-only "none",
// where a real drag of files from the desktop reports "all" or "copy", so `transfer()` shadows it:
// without that, React Aria would refuse the drag and show no drag-over state.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { page, server, userEvent } from 'vitest/browser';
import { Field } from '../../src/field/index';
import { FileUploadExample } from '../../src/file-upload/file-upload.example';
import {
  FileUpload,
  type FileUploadFile,
  type FileUploadItem,
  type FileUploadProps,
  type FileUploadStatus,
} from '../../src/file-upload/index';

const isWebKit = server.browser === 'webkit';
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/icon-button/icon-button.css',
    '../../src/progress-bar/progress-bar.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/file-upload/file-upload.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 8)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
// the build expands @custom-media (tokens' custom-media.css); the raw sources need it done here
style.textContent = Object.values(STYLES).join('\n').replaceAll('(--nz-sm)', '(width >= 40rem)');
document.head.append(style);

beforeAll(async () => {
  await page.viewport(1280, 800);
});

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.inlineSize = '400px';
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

const png = (name: string, bytes = 10): File =>
  new File([new Uint8Array(bytes)], name, { type: 'image/png', lastModified: 1 });
const text = (name: string): File => new File(['hello'], name, { type: 'text/plain' });

/** A DataTransfer as a desktop drag of `files` gives it (see the header). */
function transfer(files: readonly File[]): DataTransfer {
  const data = new DataTransfer();
  for (const file of files) data.items.add(file);
  Object.defineProperty(data, 'effectAllowed', { value: 'all' });
  return data;
}

function drag(target: Element, type: string, data: DataTransfer): void {
  target.dispatchEvent(
    new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }),
  );
}

/** Drags `files` over the zone and drops them. */
async function dropOn(zone: Element, files: readonly File[]): Promise<void> {
  const data = transfer(files);
  drag(zone, 'dragenter', data);
  drag(zone, 'dragover', data);
  drag(zone, 'drop', data);
  await settle();
}

function one(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return element;
}

function formIn(root: ParentNode): HTMLFormElement {
  const form = root.querySelector('form');
  if (form === null) throw new Error('no form');
  return form;
}

const zoneOf = (root: ParentNode): HTMLElement => one(root, '[data-slot="file-upload-dropzone"]');
function inputOf(root: ParentNode): HTMLInputElement {
  const input = one(root, '[data-slot="file-upload-input"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
  return input;
}
const names = (root: ParentNode): string[] =>
  [...root.querySelectorAll('[data-slot="file-upload-item-name"]')].map((n) => n.textContent ?? '');
const messages = (root: ParentNode): string[] =>
  [...root.querySelectorAll('[data-slot="inline-error-message"]')].map((n) => n.textContent ?? '');

/** The file names a submit of the form would send under `name`. */
function submitted(root: ParentNode, name: string): string[] {
  return new FormData(formIn(root))
    .getAll(name)
    .map((value) => (value instanceof File ? value.name : value))
    .filter((value) => value !== '');
}

describe('before hydration', () => {
  test('the server input chooses files and its form submits them; hydration adopts them', async () => {
    const app = (
      <form>
        <FileUploadExample />
      </form>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(app);
    document.body.append(container);
    // the native path: a pick (or a drop on the input that covers the zone) fills the input
    inputOf(container).files = transfer([png('mug.png'), png('bowl.png')]).files;
    expect(submitted(container, 'images')).toEqual(['mug.png', 'bowl.png']);
    expect(names(container)).toEqual([]);

    const problems: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
    roots.push(hydrateRoot(container, app, { onRecoverableError: (e) => problems.push(e) }));
    await settle();
    expect(problems).toEqual([]);
    expect(names(container)).toEqual(['mug.png', 'bowl.png']);
    expect(submitted(container, 'images')).toEqual(['mug.png', 'bowl.png']);
  });
});

describe('choosing and dropping', () => {
  test('a pick through the input lists the files, adds to them with multiple, and submits them', async () => {
    const onFilesChange = vi.fn<(files: FileUploadFile[]) => void>();
    const root = await mount(
      <form>
        <FileUpload name="docs" multiple onFilesChange={onFilesChange} />
      </form>,
    );
    await userEvent.upload(inputOf(root), [png('a.png'), png('b.png')]);
    await settle();
    expect(names(root)).toEqual(['a.png', 'b.png']);
    await userEvent.upload(inputOf(root), [png('c.png')]);
    await settle();
    expect(names(root)).toEqual(['a.png', 'b.png', 'c.png']);
    expect(submitted(root, 'docs')).toEqual(['a.png', 'b.png', 'c.png']);
    const last = onFilesChange.mock.lastCall?.[0] ?? [];
    expect(last.map((entry) => entry.file.name)).toEqual(['a.png', 'b.png', 'c.png']);
    expect(new Set(last.map((entry) => entry.id)).size).toBe(3);
    // the first two kept their ids
    expect(last.slice(0, 2).map((e) => e.id)).toEqual(
      onFilesChange.mock.calls[0]?.[0].map((e) => e.id),
    );
  });

  test('without multiple, a new pick replaces the file', async () => {
    const root = await mount(
      <form>
        <FileUpload name="logo" />
      </form>,
    );
    await userEvent.upload(inputOf(root), png('old.png'));
    await userEvent.upload(inputOf(root), png('new.png'));
    await settle();
    expect(names(root)).toEqual(['new.png']);
    expect(submitted(root, 'logo')).toEqual(['new.png']);
  });

  test('a drag with files shows the drag-over state; leaving clears it; a drop adds the files', async () => {
    const root = await mount(
      <form>
        <FileUpload name="images" multiple />
      </form>,
    );
    const zone = zoneOf(root);
    const prompt = one(root, '[data-slot="file-upload-prompt"]');
    const data = transfer([png('drop.png')]);
    drag(zone, 'dragenter', data);
    drag(zone, 'dragover', data);
    await settle();
    expect(zone.hasAttribute('data-drag-over')).toBe(true);
    expect(prompt.textContent).toBe('Release to add files');
    drag(zone, 'dragleave', data);
    await settle();
    expect(zone.hasAttribute('data-drag-over')).toBe(false);
    expect(prompt.textContent).toBe('Drop files here or browse');

    await dropOn(zone, [png('drop.png'), png('two.png')]);
    expect(zone.hasAttribute('data-drag-over')).toBe(false);
    expect(names(root)).toEqual(['drop.png', 'two.png']);
    expect(submitted(root, 'images')).toEqual(['drop.png', 'two.png']);
  });

  test('a drag of text, not files, shows no drag-over state and adds nothing', async () => {
    const root = await mount(<FileUpload aria-label="Files" />);
    const zone = zoneOf(root);
    const data = new DataTransfer();
    data.setData('text/plain', 'hello');
    Object.defineProperty(data, 'effectAllowed', { value: 'all' });
    drag(zone, 'dragenter', data);
    drag(zone, 'dragover', data);
    await settle();
    expect(zone.hasAttribute('data-drag-over')).toBe(false);
    drag(zone, 'drop', data);
    await settle();
    expect(names(root)).toEqual([]);
  });

  test('disabled: no drag-over state, a drop adds nothing and the browser does not open the file', async () => {
    const root = await mount(<FileUpload aria-label="Files" disabled />);
    const zone = zoneOf(root);
    const data = transfer([png('x.png')]);
    drag(zone, 'dragenter', data);
    drag(zone, 'dragover', data);
    await settle();
    expect(zone.hasAttribute('data-drag-over')).toBe(false);
    const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data });
    zone.dispatchEvent(drop);
    await settle();
    expect(drop.defaultPrevented).toBe(true);
    expect(names(root)).toEqual([]);
    expect(inputOf(root).disabled).toBe(true);
  });
});

describe('accept and maxSize', () => {
  test('a refused file is not added; its message shows, is spoken and describes the input', async () => {
    const onReject = vi.fn<NonNullable<FileUploadProps['onReject']>>();
    const root = await mount(
      <form>
        <FileUpload
          name="images"
          accept="image/*,.pdf"
          maxSize={1000}
          multiple
          onReject={onReject}
        />
      </form>,
    );
    await dropOn(zoneOf(root), [
      png('ok.png'),
      text('notes.txt'),
      png('huge.png', 5000),
      new File(['%PDF'], 'spec.pdf', { type: '' }),
    ]);
    expect(names(root)).toEqual(['ok.png', 'spec.pdf']);
    expect(submitted(root, 'images')).toEqual(['ok.png', 'spec.pdf']);
    expect(messages(root)).toEqual([
      'notes.txt is not an accepted file type.',
      'huge.png is larger than 1 kB.',
    ]);
    expect(onReject).toHaveBeenCalledWith([
      expect.objectContaining({ reason: 'type' }),
      expect.objectContaining({ reason: 'size' }),
    ]);
    const region = one(root, '[data-slot="file-upload-messages"]');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(inputOf(root).getAttribute('aria-describedby')?.split(' ')).toContain(region.id);
    expect(zoneOf(root).hasAttribute('data-invalid')).toBe(true);

    // the next pick clears the messages
    await userEvent.upload(inputOf(root), png('more.png'));
    await settle();
    expect(messages(root)).toEqual([]);
    expect(zoneOf(root).hasAttribute('data-invalid')).toBe(false);
    expect(inputOf(root).getAttribute('aria-describedby')).toBeNull();
  });

  test('a refused pick leaves the input holding the list, not the refused file', async () => {
    const root = await mount(
      <form>
        <FileUpload name="doc" accept=".pdf" />
      </form>,
    );
    await userEvent.upload(inputOf(root), new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }));
    await userEvent.upload(inputOf(root), text('b.txt'));
    await settle();
    expect(names(root)).toEqual(['a.pdf']);
    expect(submitted(root, 'doc')).toEqual(['a.pdf']);
    expect(messages(root)).toEqual(['b.txt is not an accepted file type.']);
  });

  test('without multiple, a drop of two keeps the first and refuses the second', async () => {
    const root = await mount(<FileUpload aria-label="Logo" />);
    await dropOn(zoneOf(root), [png('first.png'), png('second.png')]);
    expect(names(root)).toEqual(['first.png']);
    expect(messages(root)).toEqual(['second.png was not added: choose one file.']);
  });
});

/** An app that uploads each file as it is chosen, and reports its state back through `items`. */
function Uploader(props: {
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  status: FileUploadStatus;
}): JSX.Element {
  const [items, setItems] = useState<FileUploadItem[]>([]);
  return (
    <FileUpload
      aria-label="Attachments"
      multiple
      items={items}
      onFilesChange={(files) =>
        setItems(files.map(({ id }) => ({ id, status: props.status, progress: 40 })))
      }
      onRetry={props.onRetry}
      onCancel={props.onCancel}
    />
  );
}

/** One app-held item in `status` (none: chosen, not sent), with a hint and an icon in the zone. */
function States({ status }: { status: FileUploadStatus | undefined }): JSX.Element {
  const item: FileUploadItem = { id: 'a', name: 'a.png', size: 1200, progress: 50 };
  return (
    <FileUpload
      aria-label="Files"
      hint="PNG, up to 20 MB"
      icon={<svg width="1em" height="1em" />}
      items={[status === undefined ? item : { ...item, status }]}
    />
  );
}

/** The zone's and the item's heights to 0.1 px (Firefox's layout differs in the fifth decimal). */
function measure(root: HTMLElement): string {
  const zone = zoneOf(root).getBoundingClientRect().height;
  const item = one(root, '[data-slot="file-upload-item"]').getBoundingClientRect().height;
  return `${zone.toFixed(1)}/${item.toFixed(1)}`;
}

describe('the list', () => {
  test('remove takes the file out of the input; focus moves to the next row, then to the input', async () => {
    const onRemove = vi.fn<(id: string) => void>();
    const root = await mount(
      <form>
        <FileUpload name="f" multiple onRemove={onRemove} />
      </form>,
    );
    await dropOn(zoneOf(root), [png('a.png'), png('b.png')]);
    one(root, '[aria-label="Remove a.png"]').focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(names(root)).toEqual(['b.png']);
    expect(submitted(root, 'f')).toEqual(['b.png']);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove b.png');
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(names(root)).toEqual([]);
    expect(submitted(root, 'f')).toEqual([]);
    expect(document.activeElement).toBe(inputOf(root));
  });

  test('uploading: a ProgressBar, data-pending and a summary; cancel drops the file and tells the app', async () => {
    const onCancel = vi.fn<(id: string) => void>();
    const root = await mount(
      <Uploader status="uploading" onCancel={onCancel} onRetry={vi.fn<(id: string) => void>()} />,
    );
    await dropOn(zoneOf(root), [png('a.png'), png('b.png')]);
    expect(one(root, '[data-slot="file-upload"]').hasAttribute('data-pending')).toBe(true);
    expect(one(root, '[data-slot="file-upload-prompt"]').textContent).toBe('0 of 2 uploaded');
    const bar = root.querySelector('progress');
    if (bar === null) throw new Error('no progress bar');
    expect(bar.value).toBe(40);
    expect(bar.getAttribute('aria-label')).toBe('Uploading a.png');
    const cancel = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Cancel');
    await userEvent.click(cancel ?? root);
    await settle();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(names(root)).toEqual(['b.png']);
  });

  test('error: the message and a retry described by the file name', async () => {
    const onRetry = vi.fn<(id: string) => void>();
    const root = await mount(
      <Uploader status="error" onCancel={vi.fn<(id: string) => void>()} onRetry={onRetry} />,
    );
    await dropOn(zoneOf(root), [png('a.png')]);
    expect(one(root, '[data-slot="file-upload-item"]').hasAttribute('data-error')).toBe(true);
    expect(one(root, '[data-slot="file-upload-item-error"]').textContent).toBe('Upload failed');
    const retry = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Retry');
    const describedBy = retry?.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('a.png');
    await userEvent.click(retry ?? root);
    const [id] = onRetry.mock.lastCall ?? [];
    expect(typeof id).toBe('string');
  });

  test('no jump: the zone and an item keep their height through every state', async () => {
    const statuses = [undefined, 'uploading', 'complete', 'error'] as const;
    const mounted = await Promise.all(statuses.map((status) => mount(<States status={status} />)));
    const heights = new Set(mounted.map(measure));
    // and the drag-over state
    const root = await mount(<States status={undefined} />);
    const data = transfer([png('x.png')]);
    drag(zoneOf(root), 'dragenter', data);
    drag(zoneOf(root), 'dragover', data);
    await settle();
    expect(zoneOf(root).hasAttribute('data-drag-over')).toBe(true);
    heights.add(measure(root));
    expect([...heights]).toHaveLength(1);
  });
});

describe('keyboard and Field', () => {
  test('Tab reaches the file input, with the outline on the zone, then each item’s buttons', async () => {
    const root = await mount(
      <div>
        <input aria-label="Before" data-before="" />
        <FileUpload aria-label="Files" items={[{ id: 'a', name: 'a.png', status: 'error' }]} />
      </div>,
    );
    // WebKit on macOS does not Tab to a file input or a button by default: there the Tab press
    // sets keyboard modality and the input is then focused by script; the order after it is not
    // checked (CLAUDE.md, known WebKit Tab order)
    one(root, '[data-before]').focus();
    await userEvent.keyboard('{Tab}');
    if (isWebKit && document.activeElement !== inputOf(root)) inputOf(root).focus();
    expect(document.activeElement).toBe(inputOf(root));
    // a native file input: Enter and Space open the platform's picker
    expect(inputOf(root).type).toBe('file');
    const outline = getComputedStyle(zoneOf(root));
    expect(outline.outlineStyle).toBe('solid');
    expect(outline.outlineWidth).toBe('2px');
    if (isWebKit) return;
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.textContent).toBe('Retry');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove a.png');
  });

  test('required in a Field: a submit shows the message; a drop withdraws it and the form submits the file', async () => {
    const onSubmit = vi.fn<(event: SubmitEvent) => void>((event) => event.preventDefault());
    const root = await mount(
      <form>
        <Field label="Images" required messages={{ valueMissing: 'Add an image.' }}>
          <FileUpload name="images" multiple />
        </Field>
      </form>,
    );
    const form = formIn(root);
    form.addEventListener('submit', onSubmit);
    form.requestSubmit();
    await vi.waitFor(() => expect(inputOf(root).getAttribute('aria-invalid')).toBe('true'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(one(root, '[data-slot="field-error"]').textContent).toContain('Add an image.');
    expect(document.activeElement).toBe(inputOf(root));

    await dropOn(zoneOf(root), [png('mug.png')]);
    await vi.waitFor(() => expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false));
    expect(root.querySelector('[data-slot="field-error"]')).toBeNull();
    form.requestSubmit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submitted(root, 'images')).toEqual(['mug.png']);
  });

  test('a click on the Field label focuses the zone without opening the picker', async () => {
    const root = await mount(
      <Field label="Images">
        <FileUpload name="images" />
      </Field>,
    );
    const onClick = vi.fn<() => void>();
    inputOf(root).addEventListener('click', onClick);
    await userEvent.click(one(root, 'label'));
    expect(document.activeElement).toBe(inputOf(root));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('the form’s reset empties the list and the input', async () => {
    const onFilesChange = vi.fn<NonNullable<FileUploadProps['onFilesChange']>>();
    const root = await mount(
      <form>
        <FileUpload name="f" multiple onFilesChange={onFilesChange} />
      </form>,
    );
    await dropOn(zoneOf(root), [png('a.png')]);
    formIn(root).reset();
    await settle();
    expect(names(root)).toEqual([]);
    expect(submitted(root, 'f')).toEqual([]);
    expect(onFilesChange).toHaveBeenLastCalledWith([]);
  });
});

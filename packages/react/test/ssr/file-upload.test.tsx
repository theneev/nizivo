// FileUpload (ARCHITECTURE.md §9.5 T2, §16.1): our own code on a native <input type="file">, with
// React Aria's useDrop behind FileUploadEngine for the drop target. Module graph, the RSC boundary
// and the markup before hydration: a working file input that covers the zone, named, described and
// required as a Field says. Picking, dropping, the checks, the list actions and FormData run in a
// browser: test/browser/file-upload.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Field } from '../../src/field/field';
import {
  FileUploadDisabledExample,
  FileUploadExample,
  FileUploadStatesExample,
} from '../../src/file-upload/file-upload.example';
import { FileUpload } from '../../src/file-upload/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
  {
    path: new URL('../../src/file-upload/file-upload.client.tsx', import.meta.url).pathname,
    exports: ['FileUpload'],
  },
];

/** Every vocabulary attribute name, data-slot included. */
const VOCABULARY = new Set<string>(
  [...vocabulary.state, ...vocabulary.presentational, ...vocabulary.local, ...vocabulary.scope].map(
    (entry) => entry.name,
  ),
);

/** The `<input type="file">` of an HTML string. */
function fileInput(html: string): string {
  return /<input[^>]*type="file"[^>]*>/.exec(html)?.[0] ?? '';
}

describe('module graph', () => {
  test('the subpath reaches three client modules: FileUpload, its adapter and FieldScope', () => {
    const { modules, externals } = graph(SRC, 'src/file-upload/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/_engines/react-aria/file-upload.client.tsx',
      'src/field/field-scope.client.tsx',
      'src/file-upload/file-upload.client.tsx',
    ]);
    // no engine package: the adapter is written on the DOM's drag events (D-cg)
    expect([...externals].toSorted()).toEqual(['react']);
  });

  test('the public contract reaches no engine, even as a type', () => {
    const { modules, externals } = graph(SRC, 'src/file-upload/file-upload.contract.ts', {
      types: true,
    });
    expect([...externals]).toEqual(['react']);
    expect([...modules].filter((file) => file.startsWith('src/_engines/'))).toEqual([]);
  });

  test('engine.ts re-exports the FileUploadEngine member from the react-aria adapter', () => {
    expect(SRC.get('src/file-upload/engine.ts')).toContain(
      "export { useDropTarget } from '../_engines/react-aria/file-upload.client';",
    );
  });
});

describe('react-server build, the client module as a client reference', () => {
  test('the entry loads, and every example crosses the boundary with serialisable props', async () => {
    const {
      loaded: [entry, loadedExamples],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/file-upload/index'),
          import('../../src/file-upload/file-upload.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['FileUpload']);
    expect(Object.keys(loadedExamples).toSorted()).toEqual([
      'FileUploadDisabledExample',
      'FileUploadExample',
      'FileUploadStatesExample',
    ]);
    for (const Example of Object.values(loadedExamples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('FileUpload');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup before hydration', () => {
  test('standalone: a native file input covering the zone, named by the idle prompt', () => {
    expect(renderToString(<FileUpload name="attachments" />)).toBe(
      '<div class="nz-file-upload" data-slot="file-upload">' +
        '<div class="nz-file-upload-dropzone" data-slot="file-upload-dropzone">' +
        '<input type="file" class="nz-file-upload-input" data-slot="file-upload-input" aria-label="Drop files here or browse" name="attachments"/>' +
        '<span class="nz-file-upload-prompt" data-slot="file-upload-prompt">Drop files here or ' +
        '<span class="nz-file-upload-browse" data-slot="file-upload-browse">browse</span></span>' +
        '</div>' +
        '<div class="nz-file-upload-messages" data-slot="file-upload-messages" id="_R_0_-messages" aria-live="polite"></div>' +
        '</div>',
    );
  });

  test('accept, multiple, required and the hint reach the input; the Field label names it', () => {
    const html = renderToString(<FileUploadExample />);
    const input = fileInput(html);
    for (const attribute of [
      'name="images"',
      'accept="image/png,image/jpeg,image/webp"',
      'multiple=""',
      'required=""',
      'class="nz-file-upload-input"',
    ]) {
      expect(input).toContain(attribute);
    }
    const id = /id="([^"]+)"/.exec(input)?.[1] ?? '';
    expect(html).toContain(`for="${id}"`);
    // named by the Field's label, so no fallback name of its own
    expect(input).not.toContain('aria-label');
    const hint = /aria-describedby="([^"]+)"/.exec(input)?.[1] ?? '';
    expect(html).toContain(`id="${hint}">PNG, JPG or WebP, up to 20 MB</span>`);
    expect(html).toContain('Drop product images or <span class="nz-file-upload-browse"');
  });

  test('a disabled Field disables the input and marks the zone, aria-disabled included', () => {
    const html = renderToString(<FileUploadDisabledExample />);
    expect(fileInput(html)).toContain('disabled=""');
    expect(html).toContain(
      '<div class="nz-file-upload-dropzone" data-slot="file-upload-dropzone" data-disabled="" aria-disabled="true">',
    );
  });

  test('a Field error marks the zone invalid and joins the input’s description', () => {
    const html = renderToString(
      <Field label="Invoice" error="Add the invoice.">
        <FileUpload name="invoice" />
      </Field>,
    );
    const input = fileInput(html);
    expect(input).toContain('aria-invalid="true"');
    const ids = /aria-describedby="([^"]+)"/.exec(input)?.[1]?.split(' ') ?? [];
    expect(ids.some((id) => html.includes(`id="${id}"`))).toBe(true);
    expect(html).toMatch(/data-slot="file-upload-dropzone"[^>]* data-invalid=""/);
  });

  test('items: uploading with a ProgressBar and data-pending, complete, error with retry', () => {
    const html = renderToString(<FileUploadStatesExample />);
    expect(html).toContain('<div class="nz-file-upload" data-slot="file-upload" data-pending="">');
    expect(html).toContain('>1 of 3 uploaded</span>');
    const items = html.split('<li ').slice(1);
    expect(items).toHaveLength(3);
    const [uploading = '', complete = '', failed = ''] = items;
    expect(uploading).toContain('data-pending=""');
    expect(uploading).toContain(
      '<progress class="nz-progress-bar-track" data-slot="progress-bar-track" max="100" value="60" aria-label="Uploading packing-slip.pdf">',
    );
    expect(uploading).toContain('248 kB');
    expect(uploading).toContain('>Cancel</span></button>');
    expect(complete).toContain('Uploaded</span>');
    expect(complete).toContain('aria-label="Remove invoice-1042.pdf"');
    expect(failed).toContain('data-error=""');
    expect(failed).toContain('The connection dropped</span>');
    expect(failed).toContain('>Retry</span></button>');
    // a text button is described by its row's file name
    const name = /id="([^"]+)">damaged-box\.jpg</.exec(failed)?.[1] ?? '';
    expect(failed).toContain(`aria-describedby="${name}"`);
  });

  test('an item with no progress shows an indeterminate bar; an app item with no name shows its id', () => {
    const html = renderToString(
      <FileUpload aria-label="Files" items={[{ id: 'scan-7', status: 'uploading' }]} />,
    );
    expect(html).toMatch(/<progress [^>]*max="100" aria-label="Uploading scan-7">/);
    expect(html).not.toMatch(/<progress [^>]*value=/);
  });

  test('labels replace every string, with the {browse} word placed where the template says', () => {
    const html = renderToString(
      <FileUpload
        aria-label="Fichiers"
        labels={{
          prompt: '{browse} ou déposez des fichiers',
          browse: 'Parcourir',
          list: 'Fichiers choisis',
        }}
        items={[{ id: 'x', name: 'a.pdf', status: 'error' }]}
      />,
    );
    expect(html).toContain(
      '<span class="nz-file-upload-browse" data-slot="file-upload-browse">Parcourir</span> ou déposez des fichiers',
    );
    expect(html).toContain('aria-label="Fichiers choisis"');
    expect(html).toContain('Upload failed</span>');
  });

  test('every data-* attribute rendered is in the vocabulary', () => {
    const html = [FileUploadExample, FileUploadStatesExample, FileUploadDisabledExample]
      .map((Example) => renderToString(<Example />))
      .join('');
    const names = new Set([...html.matchAll(/ (data-[a-z-]+)=/g)].map((match) => match[1] ?? ''));
    expect([...names].filter((name) => !VOCABULARY.has(name))).toEqual([]);
    expect(VOCABULARY.has('data-drag-over')).toBe(true);
  });
});

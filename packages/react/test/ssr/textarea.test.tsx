// Textarea (ARCHITECTURE.md §9.5, §16.1; src/field/FIELD-CONTRACT.md): a thin client leaf over a
// native <textarea>. Module graph, the RSC boundary, SSR markup and the Field wiring. Hydration and
// native validation run in a browser: test/browser/controls.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Field } from '../../src/field/field';
import { Textarea } from '../../src/textarea/textarea.client';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
  {
    path: new URL('../../src/textarea/textarea.client.tsx', import.meta.url).pathname,
    exports: ['Textarea'],
  },
];

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('module graph', () => {
  test('the subpath reaches two client modules, Textarea and FieldScope; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/textarea/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/field/field-scope.client.tsx',
      'src/textarea/textarea.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads, and every example crosses the boundary with serialisable props', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/textarea/index'),
          import('../../src/textarea/textarea.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['Textarea']);
    expect(Object.keys(examples).toSorted()).toEqual([
      'TextareaExample',
      'TextareaRowsExample',
      'TextareaStatesExample',
    ]);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('Textarea');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('standalone: one native element, three rows by default', () => {
    expect(renderToString(<Textarea aria-label="Note" name="note" />)).toBe(
      '<textarea name="note" aria-label="Note" rows="3" class="nz-textarea" data-slot="textarea"></textarea>',
    );
  });

  test('rows, className, value and state attributes', () => {
    const html = renderToString(
      <Textarea
        aria-label="Note"
        rows={6}
        className="mine"
        defaultValue="Packed in card."
        invalid
        disabled
        readOnly
        required
      />,
    );
    expect(html).toBe(
      '<textarea required="" disabled="" readOnly="" aria-invalid="true" aria-label="Note" ' +
        'data-disabled="" data-readonly="" data-invalid="" rows="6" class="nz-textarea mine" ' +
        'data-slot="textarea">Packed in card.</textarea>',
    );
  });
});

describe('inside a Field', () => {
  test('label for = textarea id; describedby: description, error, own; flags from the Field', () => {
    const html = renderToString(
      <Field
        ids={IDS}
        name="description"
        label="Description"
        description="Two or three sentences."
        error="Describe the product."
        required
      >
        <Textarea aria-describedby="count" />
      </Field>,
    );
    expect(html).toContain('for="c"');
    expect(html).toContain(
      '<textarea id="c" name="description" required="" aria-describedby="d e count" aria-invalid="true" data-invalid=""',
    );
  });

  test('the control’s own props win, an explicit false included', () => {
    const html = renderToString(
      <Field ids={IDS} label="Note" error="Wrong" disabled readOnly required>
        <Textarea disabled={false} readOnly={false} required={false} invalid={false} />
      </Field>,
    );
    expect(html).toContain(
      '<textarea id="c" aria-describedby="e" rows="3" class="nz-textarea" data-slot="textarea"></textarea>',
    );
  });

  test('the examples render, and every textarea has a name', async () => {
    const examples = await import('../../src/textarea/textarea.example');
    for (const Example of Object.values(examples)) {
      const html = renderToString(<Example />);
      for (const textarea of html.match(/<textarea[^>]*>/g) ?? []) {
        expect(textarea).toMatch(/aria-label="|id="/);
      }
    }
  });
});

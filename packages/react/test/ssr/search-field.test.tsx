// SearchField (ARCHITECTURE.md §9.5, §16.1 D20; figma/06 §6.3): a <search> box around a native
// <input type="search"> in one client leaf. Module graph, RSC boundary, SSR markup, labels, the
// shortcut and Field wiring. Typing, clearing, Escape, form submission and hydration run in a browser:
// test/browser/search-field.spec.tsx.
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
import { SearchField } from '../../src/search-field/search-field.client';
import {
  SearchFieldExample,
  SearchFieldFieldExample,
  SearchFieldStatesExample,
  SearchFieldTopBarExample,
} from '../../src/search-field/search-field.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const LEAF = {
  path: new URL('../../src/search-field/search-field.client.tsx', import.meta.url).pathname,
  exports: ['SearchField'],
};
const FIELD_SCOPE = {
  path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
  exports: ['FieldScope', 'useFieldControl'],
};

const ALLOWED = new Set(
  Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
);

/** The `data-*` names on every documented part (an element with `data-slot`). */
function partAttributes(html: string): string[] {
  const names = new Set<string>();
  for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
    for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) if (name) names.add(name);
  }
  return [...names];
}

function part(html: string, slot: string): string {
  return new RegExp(`<[a-z]+ [^>]*data-slot="${slot}"[^>]*>`).exec(html)?.[0] ?? '';
}

describe('module graph', () => {
  test('the subpath reaches its leaf and FieldScope, no engine, and imports only react', () => {
    const { modules, externals } = graph(SRC, 'src/search-field/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/field/field-scope.client.tsx',
      'src/search-field/search-field.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads and every example crosses with serialisable props only', async () => {
    const { loaded, react } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/search-field/index'),
          import('../../src/search-field/search-field.example'),
        ]),
      [LEAF, FIELD_SCOPE],
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry)).toEqual(['SearchField']);
    const list = Object.values(examples);
    expect(list).toHaveLength(4);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.some((b) => b.client === 'SearchField')).toBe(true);
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('a <search> box: magnifier, a named search input, a hidden clear button', () => {
    const html = renderToString(<SearchField name="q" placeholder="Search orders" />);
    expect(html).toBe(
      '<search data-slot="search-field" data-size="md" class="nz-search-field">' +
        '<span class="nz-search-field-icon" data-slot="search-field-icon" aria-hidden="true">' +
        '<svg class="nz-glyph nz-glyph-search" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg></span>' +
        '<input aria-label="Search" placeholder="Search orders" type="search" class="nz-search-field-control" data-slot="search-field-control" name="q"/>' +
        '<button type="button" class="nz-search-field-clear" data-slot="search-field-clear" aria-label="Clear search" tabindex="-1" hidden="">' +
        '<svg class="nz-glyph nz-glyph-close" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button></search>',
    );
  });

  test('a default value shows the clear button; a controlled value decides it', () => {
    expect(
      part(renderToString(<SearchField defaultValue="mug" />), 'search-field-clear'),
    ).not.toContain('hidden');
    expect(
      part(
        renderToString(<SearchField value="" onChange={() => undefined} />),
        'search-field-clear',
      ),
    ).toContain('hidden=""');
    expect(
      part(
        renderToString(<SearchField value="mug" onChange={() => undefined} />),
        'search-field-clear',
      ),
    ).not.toContain('hidden');
  });

  test('disabled and read-only have no clear button to press', () => {
    for (const html of [
      renderToString(<SearchField defaultValue="mug" disabled />),
      renderToString(<SearchField defaultValue="mug" readOnly />),
    ]) {
      expect(part(html, 'search-field-clear')).toContain('hidden=""');
    }
    expect(part(renderToString(<SearchField disabled />), 'search-field')).toContain(
      'data-disabled=""',
    );
  });

  test('shortcut: Kbd for both platforms, aria-keyshortcuts on the input, hidden once filled', () => {
    const html = renderToString(<SearchField shortcut="mod+k" />);
    expect(part(html, 'search-field-control')).toContain('aria-keyshortcuts="Meta+K Control+K"');
    expect(html).toContain(
      '<span class="nz-search-field-shortcut" data-slot="search-field-shortcut" aria-hidden="true">' +
        '<kbd data-slot="kbd" class="nz-kbd"><span class="nz-kbd-glyphs" data-slot="kbd-glyphs" data-platform="apple">⌘K</span>' +
        '<span class="nz-kbd-glyphs" data-slot="kbd-glyphs" data-platform="other">Ctrl+K</span></kbd></span>',
    );
    expect(
      part(
        renderToString(<SearchField shortcut="mod+k" defaultValue="a" />),
        'search-field-shortcut',
      ),
    ).toContain('hidden=""');
  });

  test('labels: the default name and the clear name; aria-label or aria-labelledby wins', () => {
    const html = renderToString(
      <SearchField labels={{ label: 'Search the store', clear: 'Clear' }} />,
    );
    expect(part(html, 'search-field-control')).toContain('aria-label="Search the store"');
    expect(part(html, 'search-field-clear')).toContain('aria-label="Clear"');
    expect(
      part(renderToString(<SearchField aria-label="Find" />), 'search-field-control'),
    ).toContain('aria-label="Find"');
    expect(
      part(renderToString(<SearchField aria-labelledby="h" />), 'search-field-control'),
    ).not.toContain('aria-label=');
  });

  test('pending: a spinner instead of the magnifier, and data-pending on the root', () => {
    const html = renderToString(<SearchField pending />);
    expect(part(html, 'search-field')).toContain('data-pending=""');
    expect(html).toContain('nz-glyph-spinner');
    expect(html).not.toContain('nz-glyph-search');
    expect(renderToString(<SearchField icon={<i />} />)).toContain(
      'aria-hidden="true"><i></i></span>',
    );
  });

  test('size and render keep the part slot; className and style go on the root', () => {
    const html = renderToString(
      <SearchField size="sm" render={<search title="t" />} className="x" style={{ width: 1 }} />,
    );
    expect(part(html, 'search-field')).toMatch(
      /^<search title="t" data-slot="search-field" data-size="sm" class="nz-search-field x" style="width:1px"/,
    );
  });

  test('every example stays inside the vocabulary', () => {
    for (const Example of [
      SearchFieldExample,
      SearchFieldTopBarExample,
      SearchFieldStatesExample,
      SearchFieldFieldExample,
    ]) {
      const html = renderToString(<Example />);
      expect(partAttributes(html).filter((name) => !ALLOWED.has(name))).toEqual([]);
    }
  });
});

describe('inside a Field', () => {
  test('the Field label points at the input; description and error describe it', () => {
    const html = renderToString(
      <Field
        label="Order number"
        description="Five digits."
        error="Enter at least three characters."
        required
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
      >
        <SearchField name="order" />
      </Field>,
    );
    expect(html).toContain('for="c"');
    const input = part(html, 'search-field-control');
    expect(input).toContain('id="c"');
    expect(input).toContain('aria-describedby="d e"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('required=""');
    // the Field names it: no default aria-label
    expect(input).not.toContain('aria-label');
    expect(part(html, 'search-field')).toContain('data-invalid=""');
  });
});

// Combobox (ARCHITECTURE.md §16.1): server-safety across the RSC boundary and the server HTML: the
// root, the box around the input and the Trigger, the combobox role and its closed state, the chosen
// item's text on the server, the hidden input's value, the Trigger out of the tab order, Field wiring,
// and no describedby id that points at nothing. The list, filtering and the keyboard run in a
// browser: test/overlay/combobox.spec.tsx.
import type { JSX } from 'react';
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
import { Combobox } from '../../src/combobox/index';
import { Field } from '../../src/field/field';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const PARTS = ['Root', 'Input', 'Trigger', 'Popup', 'Item', 'Group', 'GroupLabel', 'Separator'];

const CLIENT = [
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
  {
    path: new URL('../../src/combobox/combobox.client.tsx', import.meta.url).pathname,
    exports: PARTS.map((part) => `Combobox${part}`),
  },
];

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

/** The opening tag of the element with this slot, outside React Aria's collection template. */
function tag(html: string, slot: string): string {
  const live = html.replace(/<template>[\s\S]*?<\/template>/g, '');
  return new RegExp(`<(?:button|input|div)[^>]*data-slot="${slot}"[^>]*>`).exec(live)?.[0] ?? '';
}

function countries(props: Partial<Parameters<typeof Combobox.Root>[0]> = {}): JSX.Element {
  return (
    <Combobox.Root aria-label="Country" {...props}>
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Popup>
        <Combobox.Item value="at">Austria</Combobox.Item>
        <Combobox.Item value="de">Germany</Combobox.Item>
      </Combobox.Popup>
    </Combobox.Root>
  );
}

describe('module graph', () => {
  test('the contract reaches no engine; the subpath reaches the adapter, FieldScope and the config', () => {
    const contract = graph(SRC, 'src/combobox/combobox.contract.ts');
    expect([...contract.modules].filter((file) => file.startsWith('src/_engines/'))).toEqual([]);
    const { modules, externals } = graph(SRC, 'src/combobox/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/_engines/react-aria/combobox.client.tsx',
      'src/_engines/react-aria/locale.client.tsx',
      'src/_engines/react-aria/open-state.client.tsx',
      'src/_engines/react-aria/overlay.client.tsx',
      'src/combobox/combobox.client.tsx',
      'src/config/config.client.tsx',
      'src/field/field-scope.client.tsx',
    ]);
    expect([...externals].toSorted()).toEqual([
      'react',
      'react-aria-components',
      'react-aria/PortalProvider',
    ]);
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
          import('../../src/combobox/index'),
          import('../../src/combobox/combobox.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry).toSorted()).toEqual(
      ['Combobox', ...PARTS.map((part) => `Combobox${part}`)].toSorted(),
    );
    expect(Object.keys(examples).toSorted()).toEqual([
      'ComboboxExample',
      'ComboboxStatesExample',
      'ComboboxSuggestionsExample',
    ]);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('ComboboxRoot');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('the root, then the box with the combobox input and the Trigger; no list while closed', () => {
    const html = renderToString(countries({ defaultValue: 'de', name: 'country' }));
    expect(tag(html, 'combobox')).toBe(
      '<div class="nz-combobox" data-slot="combobox" data-size="md">',
    );
    expect(tag(html, 'combobox-control')).toBe(
      '<div role="group" class="nz-combobox-control nz-input" data-slot="combobox-control" data-size="md">',
    );
    const input = tag(html, 'combobox-input');
    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-expanded="false"');
    expect(input).toContain('aria-autocomplete="list"');
    expect(input).toContain('aria-label="Country"');
    // the chosen item's text, on the server
    expect(input).toContain('value="Germany"');
    expect(input).toContain('class="nz-combobox-input nz-input-control"');
    expect(input).not.toContain('aria-describedby');
    const trigger = tag(html, 'combobox-trigger');
    expect(trigger).toContain('tabindex="-1"');
    expect(trigger).toContain('aria-haspopup="listbox"');
    expect(trigger).toContain('aria-label="Show suggestions"');
    expect(html).toContain('<svg class="nz-glyph nz-glyph-chevrons-up-down"');
    expect(html).toContain('<input type="hidden" name="country" value="de"/>');
    expect(html).not.toContain('data-slot="combobox-popup"');
    expect(html).not.toMatch(/react-aria-ComboBox|data-rac|data-focused/);
  });

  test('allowsCustomValue: the input itself carries the name', () => {
    const html = renderToString(countries({ allowsCustomValue: true, name: 'q' }));
    expect(tag(html, 'combobox-input')).toContain('name="q"');
    expect(html).not.toContain('type="hidden"');
  });

  test('size and className; disabled and read-only reach the box and the input', () => {
    const sized = renderToString(countries({ size: 'lg', className: 'wide' }));
    expect(tag(sized, 'combobox')).toBe(
      '<div class="nz-combobox wide" data-slot="combobox" data-size="lg">',
    );
    expect(tag(sized, 'combobox-control')).toContain('data-size="lg"');
    const disabled = renderToString(countries({ disabled: true }));
    expect(tag(disabled, 'combobox-control')).toContain('data-disabled=""');
    expect(tag(disabled, 'combobox-input')).toContain('disabled=""');
    expect(tag(disabled, 'combobox-trigger')).toContain('disabled=""');
    const readOnly = renderToString(countries({ readOnly: true }));
    expect(tag(readOnly, 'combobox-control')).toContain('data-readonly=""');
    expect(tag(readOnly, 'combobox-input')).toContain('readOnly=""');
  });
});

describe('inside a Field', () => {
  test('the label points at the input and names the Trigger; description and error ids; flags', () => {
    const html = renderToString(
      <Field
        ids={IDS}
        name="country"
        label="Country"
        description="Ship to."
        error="Choose a country."
        required
      >
        <Combobox.Root>
          <Combobox.Input />
          <Combobox.Trigger />
          <Combobox.Popup>
            <Combobox.Item value="at">Austria</Combobox.Item>
          </Combobox.Popup>
        </Combobox.Root>
      </Field>,
    );
    expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l" for="c">');
    const input = tag(html, 'combobox-input');
    expect(input).toContain('id="c"');
    expect(input).toContain('aria-labelledby="l"');
    expect(input).toContain('required=""');
    expect(input).toContain('aria-describedby="d e"');
    expect(input).toContain('aria-invalid="true"');
    expect(tag(html, 'combobox-control')).toContain('data-invalid=""');
    const trigger = tag(html, 'combobox-trigger');
    const id = /\sid="([^"]+)"/.exec(trigger)?.[1] ?? '';
    // "Show suggestions" + "Country"
    expect(trigger).toContain(`aria-labelledby="${id} l"`);
    expect(html).toContain('<input type="hidden" name="country" value=""/>');
  });
});

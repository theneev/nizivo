// SegmentedControl (ARCHITECTURE.md §9.5, §8.5; figma/12 §4.7): a native radio group in one client
// leaf. Module graph, RSC boundary, SSR markup and Field wiring. Keyboard, forms and hydration run in a
// browser: test/browser/segmented-control.spec.tsx.
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
import {
  SegmentedControlItem as Item,
  SegmentedControlRoot as Root,
} from '../../src/segmented-control/segmented-control.client';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const LEAF = {
  path: new URL('../../src/segmented-control/segmented-control.client.tsx', import.meta.url)
    .pathname,
  exports: ['SegmentedControlRoot', 'SegmentedControlItem'],
};
const FIELD_SCOPE = {
  path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
  exports: ['FieldScope', 'useFieldControl'],
};

describe('module graph', () => {
  test('the subpath reaches its leaf and FieldScope, no engine, and imports only react', () => {
    const { modules, externals } = graph(SRC, 'src/segmented-control/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/field/field-scope.client.tsx',
      'src/segmented-control/segmented-control.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads and every example crosses with serialisable props only', async () => {
    const { loaded, react } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/segmented-control/index'),
          import('../../src/segmented-control/segmented-control.example'),
        ]),
      [LEAF, FIELD_SCOPE],
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted((a, b) => a.localeCompare(b))).toEqual([
      'SegmentedControl',
      'SegmentedControlItem',
      'SegmentedControlRoot',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(4);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.some((b) => b.client === 'SegmentedControlRoot')).toBe(true);
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('a radiogroup of labelled radios; the default is checked; the label is sized for bold', () => {
    const html = renderToString(
      <Root aria-label="Range" name="range" defaultValue="30d">
        <Item value="7d">7D</Item>
        <Item value="30d">30D</Item>
      </Root>,
    );
    expect(html).toBe(
      '<div data-slot="segmented-control" data-size="md" aria-label="Range" role="radiogroup" class="nz-segmented-control">' +
        '<label data-slot="segmented-control-item" class="nz-segmented-control-item">' +
        '<input type="radio" class="nz-segmented-control-input" data-slot="segmented-control-input" name="range" value="7d"/>' +
        '<span class="nz-segmented-control-label" data-slot="segmented-control-label"><span class="nz-segmented-control-text">7D</span>' +
        '<span class="nz-segmented-control-sizer" aria-hidden="true">7D</span></span></label>' +
        '<label data-slot="segmented-control-item" class="nz-segmented-control-item">' +
        '<input type="radio" class="nz-segmented-control-input" data-slot="segmented-control-input" name="range" checked="" value="30d"/>' +
        '<span class="nz-segmented-control-label" data-slot="segmented-control-label"><span class="nz-segmented-control-text">30D</span>' +
        '<span class="nz-segmented-control-sizer" aria-hidden="true">30D</span></span></label></div>',
    );
  });

  test('controlled: value checks its radio', () => {
    const html = renderToString(
      <Root aria-label="Range" name="r" value="7d" onValueChange={() => undefined}>
        <Item value="7d">7D</Item>
        <Item value="30d">30D</Item>
      </Root>,
    );
    expect(html).toContain('checked="" value="7d"');
    expect(html).not.toContain('checked="" value="30d"');
  });

  test('without a name, a generated one still groups the radios', () => {
    const html = renderToString(
      <Root aria-label="Range">
        <Item value="a">A</Item>
        <Item value="b">B</Item>
      </Root>,
    );
    const names = [...html.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
    expect(names).toHaveLength(2);
    expect(names[0]).toBe(names[1]);
    expect(names[0]).not.toBe('');
  });

  test('size, full width, required, form and disabled', () => {
    const html = renderToString(
      <Root aria-label="Range" name="r" size="sm" fullWidth required form="filters" disabled>
        <Item value="a">A</Item>
      </Root>,
    );
    expect(html).toMatch(
      /^<div data-slot="segmented-control" data-size="sm" data-full-width="" data-disabled="" data-required="" aria-label="Range" role="radiogroup" aria-required="true" class="nz-segmented-control">/,
    );
    expect(html).toContain('<label data-slot="segmented-control-item" data-disabled=""');
    expect(html).toContain('required="" form="filters"');
    expect(html).toContain('disabled=""');
  });

  test('one disabled item; an icon-only item is named on its radio, and its glyph is hidden', () => {
    const html = renderToString(
      <Root aria-label="Layout" name="layout">
        <Item value="list" icon={<svg />} aria-label="List" />
        <Item value="grid" disabled>
          Grid
        </Item>
      </Root>,
    );
    expect(html).toContain('aria-label="List" name="layout" value="list"/>');
    expect(html).toContain(
      '<span class="nz-segmented-control-icon" data-slot="segmented-control-icon" aria-hidden="true"><svg></svg></span></label>',
    );
    expect(html).toContain('disabled="" name="layout" value="grid"');
    expect(html.match(/data-disabled=""/g)).toHaveLength(1);
  });

  test('render keeps the part slot', () => {
    const html = renderToString(
      <Root aria-label="Range" render={<fieldset />}>
        <Item value="a" render={<span title="A" />}>
          A
        </Item>
      </Root>,
    );
    expect(html).toMatch(/^<fieldset data-slot="segmented-control" /);
    expect(html).toContain('<span title="A" data-slot="segmented-control-item"');
  });
});

describe('inside a Field', () => {
  test('the Field label names the group and its description and error describe it', () => {
    const html = renderToString(
      <Field
        group
        label="Delivery speed"
        description="Express ships today."
        error="Choose a delivery speed."
        name="speed"
        required
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
      >
        <Root>
          <Item value="standard">Standard</Item>
          <Item value="express">Express</Item>
        </Root>
      </Field>,
    );
    const root = /<div data-slot="segmented-control"[^>]*>/.exec(html)?.[0] ?? '';
    expect(root).toContain('aria-labelledby="l"');
    expect(root).toContain('aria-describedby="d e"');
    expect(root).toContain('aria-invalid="true"');
    expect(root).toContain('aria-required="true"');
    expect(root).toContain('data-invalid=""');
    expect(root).not.toContain(' id=');
    const radios = html.match(/<input [^>]*>/g) ?? [];
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toContain('name="speed"');
      expect(radio).toContain('required=""');
      expect(radio).not.toMatch(/ id=|aria-describedby|aria-invalid/);
    }
  });

  test("the control's own aria-labelledby wins over the Field label", () => {
    const html = renderToString(
      <Field label="Range" ids={{ label: 'l' }} group>
        <Root aria-labelledby="heading">
          <Item value="a">A</Item>
        </Root>
      </Field>,
    );
    expect(html).toContain('aria-labelledby="heading"');
  });
});

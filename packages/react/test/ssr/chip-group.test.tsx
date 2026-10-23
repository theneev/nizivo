// ChipGroup (ARCHITECTURE.md §9.5, §16.1; figma/05 §3.2): native radios, or checkboxes with `multiple`,
// inside labels, in one client leaf. Module graph, RSC boundary, SSR markup, `unavailable`, the swatch
// slot and Field wiring. Keyboard, forms and hydration run in a browser:
// test/browser/chip-group.spec.tsx.
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
import { Chip, ChipGroup } from '../../src/chip-group/chip-group.client';
import {
  ChipGroupErrorExample,
  ChipGroupExample,
  ChipGroupMultipleExample,
  ChipGroupSizesExample,
} from '../../src/chip-group/chip-group.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const LEAF = {
  path: new URL('../../src/chip-group/chip-group.client.tsx', import.meta.url).pathname,
  exports: ['ChipGroup', 'Chip'],
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
  for (const [opening] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
    for (const [, name] of opening.matchAll(/\s(data-[a-z0-9-]+)=/g)) if (name) names.add(name);
  }
  return [...names];
}

function inputs(html: string): string[] {
  return html.match(/<input [^>]*>/g) ?? [];
}

describe('module graph', () => {
  test('the subpath reaches its leaf, FieldScope and the config, no engine, and imports only react', () => {
    const { modules, externals } = graph(SRC, 'src/chip-group/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/chip-group/chip-group.client.tsx',
      'src/config/config.client.tsx',
      'src/field/field-scope.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads and every example crosses with serialisable props only', async () => {
    const { loaded, react } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/chip-group/index'),
          import('../../src/chip-group/chip-group.example'),
        ]),
      [LEAF, FIELD_SCOPE],
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted((a, b) => a.localeCompare(b))).toEqual([
      'Chip',
      'ChipGroup',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(4);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.some((b) => b.client === 'ChipGroup')).toBe(true);
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('one value: a radiogroup of labelled hidden radios; the default is checked', () => {
    const html = renderToString(
      <ChipGroup aria-label="Size" name="size" defaultValue="m">
        <Chip value="s">S</Chip>
        <Chip value="m">M</Chip>
      </ChipGroup>,
    );
    expect(html).toBe(
      '<div data-slot="chip-group" aria-label="Size" role="radiogroup" class="nz-chip-group">' +
        '<label data-slot="chip" class="nz-chip">' +
        '<input type="radio" class="nz-chip-input" data-slot="chip-input" name="size" value="s"/>' +
        '<span class="nz-chip-label" data-slot="chip-label">S</span></label>' +
        '<label data-slot="chip" class="nz-chip">' +
        '<input type="radio" class="nz-chip-input" data-slot="chip-input" name="size" checked="" value="m"/>' +
        '<span class="nz-chip-label" data-slot="chip-label">M</span></label></div>',
    );
  });

  test('multiple: a group of checkboxes; each default value is checked', () => {
    const html = renderToString(
      <ChipGroup aria-label="Status" name="status" multiple defaultValue={['paid', 'open']}>
        <Chip value="open">Open</Chip>
        <Chip value="paid">Paid</Chip>
        <Chip value="refunded">Refunded</Chip>
      </ChipGroup>,
    );
    expect(html).toMatch(/^<div data-slot="chip-group" aria-label="Status" role="group" /);
    const boxes = inputs(html);
    expect(boxes.map((box) => box.includes('type="checkbox"'))).toEqual([true, true, true]);
    expect(boxes.map((box) => box.includes('checked=""'))).toEqual([true, true, false]);
    for (const box of boxes) expect(box).toContain('name="status"');
  });

  test('controlled: value checks its chips, in both modes', () => {
    const single = renderToString(
      <ChipGroup aria-label="Size" value="s" onValueChange={() => undefined}>
        <Chip value="s">S</Chip>
        <Chip value="m">M</Chip>
      </ChipGroup>,
    );
    expect(single).toContain('checked="" value="s"');
    expect(single).not.toContain('checked="" value="m"');
    const multiple = renderToString(
      <ChipGroup aria-label="Status" multiple value={['m']} onValueChange={() => undefined}>
        <Chip value="s">S</Chip>
        <Chip value="m">M</Chip>
      </ChipGroup>,
    );
    expect(multiple).toContain('checked="" value="m"');
    expect(multiple).not.toContain('checked="" value="s"');
  });

  test('without a name, a generated one still groups the radios', () => {
    const html = renderToString(
      <ChipGroup aria-label="Size">
        <Chip value="a">A</Chip>
        <Chip value="b">B</Chip>
      </ChipGroup>,
    );
    const names = [...html.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
    expect(names).toHaveLength(2);
    expect(names[0]).toBe(names[1]);
    expect(names[0]).not.toBe('');
  });

  test('a swatch: decorative, before the text; a swatch-only chip is named on its input', () => {
    const html = renderToString(
      <ChipGroup aria-label="Colour" name="c">
        <Chip value="moss" leading={<span title="swatch" />}>
          Moss
        </Chip>
        <Chip value="white" leading={<span />} aria-label="White" />
      </ChipGroup>,
    );
    expect(html).toContain(
      '<span class="nz-chip-leading" data-slot="chip-leading" aria-hidden="true"><span title="swatch"></span></span>' +
        '<span class="nz-chip-label" data-slot="chip-label">Moss</span>',
    );
    expect(html).toContain('aria-label="White" name="c" value="white"/>');
  });

  test('unavailable: struck through, described by a hidden note, and still selectable', () => {
    const html = renderToString(
      <ChipGroup aria-label="Colour" name="c" labels={{ unavailable: 'Sold out' }}>
        <Chip value="sand" leading={<span />} unavailable>
          Sand
        </Chip>
        <Chip value="xs" unavailable>
          XS
        </Chip>
      </ChipGroup>,
    );
    const [sand, xs] = inputs(html);
    expect(sand).not.toContain('disabled');
    const note = /aria-describedby="([^"]+)"/.exec(sand ?? '')?.[1];
    expect(note).toBeDefined();
    expect(html).toContain(`<span id="${note}" hidden="">Sold out</span>`);
    // the strike sits on the swatch, or on the whole chip without one
    expect(html).toContain(
      '<span class="nz-chip-leading" data-slot="chip-leading" aria-hidden="true"><span></span>' +
        '<span class="nz-chip-strike" data-slot="chip-strike" aria-hidden="true"></span></span>',
    );
    expect(html).toContain(
      '<span class="nz-chip-label" data-slot="chip-label">XS</span><span class="nz-chip-strike" data-slot="chip-strike" aria-hidden="true"></span>',
    );
    expect(xs).toContain('aria-describedby=');
  });

  test('disabled: one chip, or the whole group', () => {
    const one = renderToString(
      <ChipGroup aria-label="Size">
        <Chip value="s">S</Chip>
        <Chip value="xl" disabled>
          XL
        </Chip>
      </ChipGroup>,
    );
    expect(one.match(/data-disabled=""/g)).toHaveLength(1);
    expect(one).toContain('<label data-slot="chip" data-disabled="" class="nz-chip">');
    const all = renderToString(
      <ChipGroup aria-label="Size" disabled>
        <Chip value="s">S</Chip>
      </ChipGroup>,
    );
    expect(all).toMatch(/^<div data-slot="chip-group" data-disabled=""/);
    expect(inputs(all)[0]).toContain('disabled=""');
  });

  test('render keeps the part slot', () => {
    const html = renderToString(
      <ChipGroup aria-label="Size" render={<fieldset />}>
        <Chip value="a" render={<span title="A" />}>
          A
        </Chip>
      </ChipGroup>,
    );
    expect(html).toMatch(/^<fieldset data-slot="chip-group" /);
    expect(html).toContain('<span title="A" data-slot="chip"');
  });

  test('every example stays inside the vocabulary', () => {
    for (const Example of [
      ChipGroupExample,
      ChipGroupSizesExample,
      ChipGroupMultipleExample,
      ChipGroupErrorExample,
    ]) {
      const html = renderToString(<Example />);
      expect(partAttributes(html).filter((name) => !ALLOWED.has(name))).toEqual([]);
    }
  });
});

describe('inside a Field', () => {
  test('single: the Field label names the radiogroup; its error and required are on the root', () => {
    const html = renderToString(
      <Field
        group
        label="Fit"
        description="How it sits."
        error="Choose a fit."
        name="fit"
        required
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
      >
        <ChipGroup>
          <Chip value="regular">Regular</Chip>
          <Chip value="slim">Slim</Chip>
        </ChipGroup>
      </Field>,
    );
    const root = /<div data-slot="chip-group"[^>]*>/.exec(html)?.[0] ?? '';
    expect(root).toContain('role="radiogroup"');
    expect(root).toContain('aria-labelledby="l"');
    expect(root).toContain('aria-describedby="d e"');
    expect(root).toContain('aria-invalid="true"');
    expect(root).toContain('aria-required="true"');
    expect(root).toContain('data-invalid=""');
    expect(root).not.toContain(' id=');
    for (const radio of inputs(html)) {
      expect(radio).toContain('name="fit"');
      expect(radio).toContain('required=""');
      expect(radio).not.toMatch(/ id=|aria-invalid/);
    }
  });

  test('multiple: a group takes neither aria-invalid nor required; each checkbox is invalid', () => {
    const html = renderToString(
      <Field group label="Status" error="Choose one." name="status" required ids={{ label: 'l' }}>
        <ChipGroup multiple>
          <Chip value="open">Open</Chip>
          <Chip value="paid">Paid</Chip>
        </ChipGroup>
      </Field>,
    );
    const root = /<div data-slot="chip-group"[^>]*>/.exec(html)?.[0] ?? '';
    expect(root).toContain('role="group"');
    expect(root).toContain('aria-labelledby="l"');
    expect(root).not.toMatch(/aria-invalid|aria-required/);
    for (const box of inputs(html)) {
      expect(box).toContain('aria-invalid="true"');
      expect(box).not.toContain('required');
    }
  });
});

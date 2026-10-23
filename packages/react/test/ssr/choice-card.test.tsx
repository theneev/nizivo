// ChoiceCard (ARCHITECTURE.md §9.5, §16.1; figma/05 §3.6): cards around real native radios, in one
// client leaf. Module graph, RSC boundary, SSR markup (name and description ids, the leading slot,
// composition of a Badge) and Field wiring, the invalid state included. Keyboard, forms and hydration
// run in a browser: test/browser/choice-card.spec.tsx.
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
import { Badge } from '../../src/badge/badge';
import { Field } from '../../src/field/field';
import { ChoiceCard, ChoiceCardGroup } from '../../src/choice-card/choice-card.client';
import {
  ChoiceCardDeliveryExample,
  ChoiceCardExample,
  ChoiceCardInvalidExample,
} from '../../src/choice-card/choice-card.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const LEAF = {
  path: new URL('../../src/choice-card/choice-card.client.tsx', import.meta.url).pathname,
  exports: ['ChoiceCardGroup', 'ChoiceCard'],
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
  test('the subpath reaches its leaf and FieldScope, no engine, and imports only react', () => {
    const { modules, externals } = graph(SRC, 'src/choice-card/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/choice-card/choice-card.client.tsx',
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
          import('../../src/choice-card/index'),
          import('../../src/choice-card/choice-card.example'),
        ]),
      [LEAF, FIELD_SCOPE],
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted((a, b) => a.localeCompare(b))).toEqual([
      'ChoiceCard',
      'ChoiceCardGroup',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(3);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.some((b) => b.client === 'ChoiceCardGroup')).toBe(true);
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('a radiogroup of cards: a visible radio named by the label and described by the second line', () => {
    const html = renderToString(
      <ChoiceCardGroup aria-label="Delivery" name="delivery" defaultValue="standard">
        <ChoiceCard value="standard" description="3–5 days" id="a">
          Standard
        </ChoiceCard>
      </ChoiceCardGroup>,
    );
    const radio = inputs(html)[0] ?? '';
    const labelId = /aria-labelledby="([^"]+)"/.exec(radio)?.[1] ?? '';
    const descriptionId = /aria-describedby="([^"]+)"/.exec(radio)?.[1] ?? '';
    expect(html).toBe(
      '<div data-slot="choice-card-group" aria-label="Delivery" role="radiogroup" class="nz-choice-card-group">' +
        '<label data-slot="choice-card" id="a" class="nz-choice-card">' +
        `<input type="radio" class="nz-choice-card-input" data-slot="choice-card-input" aria-labelledby="${labelId}" aria-describedby="${descriptionId}" name="delivery" checked="" value="standard"/>` +
        '<span class="nz-choice-card-content" data-slot="choice-card-content">' +
        `<span class="nz-choice-card-label" data-slot="choice-card-label" id="${labelId}">Standard</span>` +
        `<span class="nz-choice-card-description" data-slot="choice-card-description" id="${descriptionId}">3–5 days</span>` +
        '</span></label></div>',
    );
    expect(labelId).not.toBe(descriptionId);
  });

  test('the leading mark is decorative; a trailing Badge is composition that joins the name', () => {
    const html = renderToString(
      <ChoiceCardGroup aria-label="Payment method">
        <ChoiceCard
          value="pm_1"
          leading={<span>VISA</span>}
          trailing={<Badge dot={false}>Default</Badge>}
        >
          Visa 4242
        </ChoiceCard>
      </ChoiceCardGroup>,
    );
    expect(html).toContain(
      '<span class="nz-choice-card-leading" data-slot="choice-card-leading" aria-hidden="true"><span>VISA</span></span>',
    );
    const radio = inputs(html)[0] ?? '';
    const [labelId, trailingId] = (/aria-labelledby="([^"]+)"/.exec(radio)?.[1] ?? '').split(' ');
    expect(html).toContain(`id="${labelId}">Visa 4242</span>`);
    expect(html).toMatch(
      new RegExp(
        `<span class="nz-choice-card-trailing" data-slot="choice-card-trailing" id="${trailingId}"><span data-slot="badge"`,
      ),
    );
    expect(radio).not.toContain('aria-describedby');
  });

  test('controlled, generated name, disabled card and group', () => {
    const html = renderToString(
      <ChoiceCardGroup aria-label="Delivery" value="b" onValueChange={() => undefined}>
        <ChoiceCard value="a">A</ChoiceCard>
        <ChoiceCard value="b">B</ChoiceCard>
        <ChoiceCard value="c" disabled>
          C
        </ChoiceCard>
      </ChoiceCardGroup>,
    );
    const [a, b, c] = inputs(html);
    expect(b).toContain('checked=""');
    expect(a).not.toContain('checked');
    expect(c).toContain('disabled=""');
    const names = [...html.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(names).size).toBe(1);
    expect(html.match(/data-disabled=""/g)).toHaveLength(1);
    const all = renderToString(
      <ChoiceCardGroup aria-label="Delivery" disabled required form="checkout">
        <ChoiceCard value="a">A</ChoiceCard>
      </ChoiceCardGroup>,
    );
    expect(all).toMatch(
      /^<div data-slot="choice-card-group" data-disabled="" data-required="" aria-label="Delivery" role="radiogroup" aria-required="true"/,
    );
    expect(inputs(all)[0]).toContain('required="" form="checkout"');
  });

  test('every example stays inside the vocabulary', () => {
    for (const Example of [
      ChoiceCardExample,
      ChoiceCardDeliveryExample,
      ChoiceCardInvalidExample,
    ]) {
      const html = renderToString(<Example />);
      expect(partAttributes(html).filter((name) => !ALLOWED.has(name))).toEqual([]);
    }
  });
});

describe('inside a Field', () => {
  test('the Field label names the group; its error makes the group invalid and describes it', () => {
    const html = renderToString(
      <Field
        group
        label="Payment method"
        error="This card has expired."
        name="pm"
        required
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
      >
        <ChoiceCardGroup defaultValue="pm_3">
          <ChoiceCard value="pm_3" description="Expired 09/26">
            Amex 0005
          </ChoiceCard>
          <ChoiceCard value="pm_1">Visa 4242</ChoiceCard>
        </ChoiceCardGroup>
      </Field>,
    );
    const root = /<div data-slot="choice-card-group"[^>]*>/.exec(html)?.[0] ?? '';
    expect(root).toContain('aria-labelledby="l"');
    expect(root).toContain('aria-describedby="e"');
    expect(root).toContain('aria-invalid="true"');
    expect(root).toContain('aria-required="true"');
    expect(root).toContain('data-invalid=""');
    for (const radio of inputs(html)) {
      expect(radio).toContain('name="pm"');
      expect(radio).toContain('required=""');
      expect(radio).not.toMatch(/ id=|aria-invalid/);
    }
  });
});

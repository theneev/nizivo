// RadioGroup and Radio (ARCHITECTURE.md §9.5, §16.1; src/field/FIELD-CONTRACT.md "Fieldset"): a
// server-safe Fieldset role="radiogroup" shell around native radios in a thin client leaf.
// Server-safety across the RSC boundary and the exact SSR HTML. Behaviour (arrow keys, FormData,
// controlled value) runs in a browser: test/browser/toggles.spec.tsx.
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Radio, RadioGroup } from '../../src/radio-group/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/radio-group/radio-group.client.tsx', import.meta.url).pathname,
    exports: ['RadioGroupScope', 'Radio'],
  },
];

const VOCABULARY = new Set(
  Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
);

describe('module graph', () => {
  test('the subpath reaches exactly one client module, its own leaf; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/radio-group/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/radio-group/radio-group.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import outside the client leaf exists under react-server', () => {
    const { modules } = graph(SRC, 'src/radio-group/radio-group.tsx');
    const server = [...modules].filter((file) => !isClient(SRC.get(file) ?? ''));
    expect(server).toContain('src/radio-group/radio-group.tsx');
    expect(server).toContain('src/fieldset/fieldset.tsx');
    expect(reactImports(SRC, server).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the shell renders the fieldset on the server; only serialisable props cross to the leaf', async () => {
    const {
      loaded: [entry, loaded],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/radio-group/index'),
          import('../../src/radio-group/radio-group.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry).toSorted()).toEqual(['Radio', 'RadioGroup']);
    for (const Example of Object.values(loaded)) {
      const boundaries: ClientBoundary[] = [];
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example(), boundaries)));
      // legend, description and error are server HTML
      expect(tree).toContain('"role":"radiogroup"');
      expect(tree).toContain('"data-slot":"fieldset-legend"');
      expect(boundaries[0]?.client).toBe('RadioGroupScope');
      expect(boundaries.slice(1).every((b) => b.client === 'Radio')).toBe(true);
      expect(unserialisable(boundaries)).toEqual([]);
    }
  });
});

function onValueChange(): void {}

describe('SSR markup', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  test('a native radiogroup fieldset, one name for every radio, the default checked', () => {
    expect(
      renderToString(
        <RadioGroup legend="Shipping" name="shipping" defaultValue="standard">
          <Radio value="standard">Standard</Radio>
          <Radio value="express">Express</Radio>
        </RadioGroup>,
      ),
    ).toBe(
      '<fieldset data-slot="radio-group" role="radiogroup" data-orientation="vertical" class="nz-fieldset nz-radio-group">' +
        '<legend class="nz-fieldset-legend" data-slot="fieldset-legend">Shipping</legend>' +
        '<div class="nz-fieldset-content" data-slot="fieldset-content">' +
        '<label data-slot="radio" class="nz-radio nz-hit-target">' +
        '<input type="radio" class="nz-radio-input" data-slot="radio-input" name="shipping" checked="" value="standard"/>' +
        '<span class="nz-radio-label" data-slot="radio-label">Standard</span></label>' +
        '<label data-slot="radio" class="nz-radio nz-hit-target">' +
        '<input type="radio" class="nz-radio-input" data-slot="radio-input" name="shipping" value="express"/>' +
        '<span class="nz-radio-label" data-slot="radio-label">Express</span></label>' +
        '</div></fieldset>',
    );
    expect(errors).not.toHaveBeenCalled();
  });

  test('required and an error: aria-required, aria-invalid, required radios, joined describedby', () => {
    const html = renderToString(
      <RadioGroup
        legend="Tax"
        name="tax"
        description="Applied at checkout."
        error="Choose one."
        required
        ids={{ description: 'd', error: 'e' }}
      >
        <Radio value="standard">Standard</Radio>
      </RadioGroup>,
    );
    expect(html).toMatch(
      /^<fieldset data-slot="radio-group" data-required="" data-invalid="" role="radiogroup" aria-required="true" aria-invalid="true" data-orientation="vertical" class="nz-fieldset nz-radio-group" aria-describedby="d e">/,
    );
    expect(html).toContain('<input required="" type="radio"');
    expect(html).toContain('data-slot="fieldset-error" id="e"');
  });

  test('a generated name when none is given, shared by the group', () => {
    const html = renderToString(
      <RadioGroup legend="Unit">
        <Radio value="kg">kg</Radio>
        <Radio value="lb">lb</Radio>
      </RadioGroup>,
    );
    const names = [...html.matchAll(/name="([^"]+)"/g)].map(([, name]) => name);
    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/-radio$/);
    expect(names[1]).toBe(names[0]);
  });

  test('controlled value wins over defaultValue; null checks none', () => {
    const html = renderToString(
      <RadioGroup legend="Unit" name="u" value="lb" defaultValue="kg" onValueChange={onValueChange}>
        <Radio value="kg">kg</Radio>
        <Radio value="lb">lb</Radio>
      </RadioGroup>,
    );
    expect(html).toContain('name="u" checked="" value="lb"');
    expect(html).not.toContain('value="kg" checked');
    expect(
      renderToString(
        <RadioGroup legend="Unit" name="u" value={null} onValueChange={onValueChange}>
          <Radio value="kg">kg</Radio>
        </RadioGroup>,
      ),
    ).not.toContain('checked');
    expect(errors).not.toHaveBeenCalled();
  });

  test('disabled: the native fieldset attribute; a disabled radio marks its own label', () => {
    const html = renderToString(
      <RadioGroup legend="Unit" name="u" disabled orientation="horizontal">
        <Radio value="kg" disabled className="mine">
          kg
        </Radio>
      </RadioGroup>,
    );
    expect(html).toMatch(
      /^<fieldset data-slot="radio-group" data-disabled="" role="radiogroup" data-orientation="horizontal" class="nz-fieldset nz-radio-group" disabled="">/,
    );
    expect(html).toContain(
      '<label data-slot="radio" data-disabled="" class="nz-radio nz-hit-target mine"><input disabled="" type="radio"',
    );
  });

  test('every example renders with no console error and only vocabulary data-* on parts', async () => {
    const examples = await import('../../src/radio-group/radio-group.example');
    for (const Example of Object.values(examples)) {
      const html = renderToString(<Example />);
      for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
        for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) {
          expect(VOCABULARY.has(name ?? '')).toBe(true);
        }
      }
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

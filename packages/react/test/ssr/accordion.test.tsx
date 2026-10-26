// Accordion (ARCHITECTURE.md §21.3; D-cy): server-safe, 0 KB of client JS. Module graph, RSC render
// with no client boundary, and markup: native <details> items with a <summary> trigger, the shared
// `name` from the root (exclusive with no script), defaultOpen as the `open` attribute, and the
// decorative chevron. Opening and closing run in a browser: test/browser/accordion.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Accordion } from '../../src/accordion/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/accordion/index.ts');

  test("no 'use client' module; it imports only react: 0 KB under RSC", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('react-server build', () => {
  test('every example renders on the server with no client boundary', async () => {
    const { loaded, react } = await underReactServer(() =>
      Promise.all([
        import('../../src/accordion/index'),
        import('../../src/accordion/accordion.example'),
      ]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted()).toEqual([
      'Accordion',
      'AccordionItem',
      'AccordionPanel',
      'AccordionRoot',
      'AccordionTrigger',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(2);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      const tree = withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries).toEqual([]);
      expect(JSON.stringify(tree)).toContain('"data-slot":"accordion-trigger"');
    }
  });
});

describe('markup', () => {
  test('details items with a summary trigger, a title, the chevron and a panel', () => {
    const html = renderToString(
      <Accordion.Root>
        <Accordion.Item>
          <Accordion.Trigger>Shipping</Accordion.Trigger>
          <Accordion.Panel>Ships today.</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect(html).toBe(
      '<div data-slot="accordion" class="nz-accordion">' +
        '<details data-slot="accordion-item" class="nz-accordion-item">' +
        '<summary data-slot="accordion-trigger" class="nz-accordion-trigger">' +
        '<span class="nz-accordion-title" data-slot="accordion-title">Shipping</span>' +
        '<span class="nz-accordion-indicator" data-slot="accordion-indicator" aria-hidden="true">' +
        '<svg class="nz-glyph nz-glyph-chevron" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"></path></svg>' +
        '</span></summary>' +
        '<div data-slot="accordion-panel" class="nz-accordion-panel">Ships today.</div>' +
        '</details></div>',
    );
  });

  test('the root’s name reaches every item that sets none; an item’s own name wins', () => {
    const html = renderToString(
      <Accordion.Root name="faq">
        <Accordion.Item>
          <Accordion.Trigger>One</Accordion.Trigger>
        </Accordion.Item>
        <Accordion.Item name="other">
          <Accordion.Trigger>Two</Accordion.Trigger>
        </Accordion.Item>
        <Accordion.Item>
          <Accordion.Trigger>Three</Accordion.Trigger>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect([...html.matchAll(/<details[^>]*name="([^"]+)"/g)].map((m) => m[1])).toEqual([
      'faq',
      'other',
      'faq',
    ]);
    // the root itself carries no name attribute
    expect(html).toMatch(/^<div data-slot="accordion" class="nz-accordion">/);
  });

  test('defaultOpen is the open attribute; indicator replaces the chevron', () => {
    const html = renderToString(
      <Accordion.Item defaultOpen>
        <Accordion.Trigger indicator={<i>v</i>}>Open</Accordion.Trigger>
      </Accordion.Item>,
    );
    expect(html).toMatch(/^<details data-slot="accordion-item" open="" class="nz-accordion-item">/);
    expect(html).not.toContain('nz-glyph');
    expect(html).toContain('aria-hidden="true"><i>v</i></span>');
  });

  test('className and other props reach each part', () => {
    const html = renderToString(
      <Accordion.Root className="wide" id="faq">
        <Accordion.Item className="item" id="one">
          <Accordion.Trigger className="t">One</Accordion.Trigger>
          <Accordion.Panel className="p" id="p1">
            Body
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect(html).toContain('<div data-slot="accordion" id="faq" class="nz-accordion wide">');
    expect(html).toContain(
      '<details data-slot="accordion-item" id="one" class="nz-accordion-item item">',
    );
    expect(html).toContain('class="nz-accordion-trigger t"');
    expect(html).toContain(
      '<div data-slot="accordion-panel" id="p1" class="nz-accordion-panel p">',
    );
  });
});

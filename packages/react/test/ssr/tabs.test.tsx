// Tabs (ARCHITECTURE.md §9.2, §9.5; figma/13 §4.4): WAI-ARIA tabs on the React Aria engine. Module
// graph, RSC boundary and server markup: the selected panel is in the HTML, engine attributes are
// not. Keyboard, RTL and hydration run in a browser: test/browser/tabs.spec.tsx.
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import allowlist from '../../src/_engines/react-aria/dom-allowlist.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { NizivoConfig } from '../../src/config/index';
import { Tabs } from '../../src/tabs/index';
import { TabsExample, TabsManualExample, TabsStatesExample } from '../../src/tabs/tabs.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const LEAF = {
  path: new URL('../../src/tabs/tabs.client.tsx', import.meta.url).pathname,
  exports: ['TabsRoot', 'TabsList', 'TabsTab', 'TabsPanel'],
};
const TEXTAREA = {
  path: new URL('../../src/textarea/textarea.client.tsx', import.meta.url).pathname,
  exports: ['Textarea'],
};

const allowed = new Set([
  ...Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
  ...allowlist.attributes,
]);

/** Every opening tag that carries a `data-slot`. */
function parts(html: string): string[] {
  return [...html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)].map(
    ([opening]) => opening,
  );
}

function tag(html: string, pattern: RegExp): string {
  const found = parts(html).find((part) => pattern.test(part));
  if (found === undefined) throw new Error(`no part matches ${String(pattern)}`);
  return found;
}

const errors = vi.fn<(...args: unknown[]) => void>();
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(errors);
});
afterEach(() => {
  vi.restoreAllMocks();
  errors.mockReset();
});

const markup = (): string =>
  renderToString(
    <Tabs.Root defaultValue="b">
      <Tabs.List aria-label="Order status">
        <Tabs.Tab value="a">All</Tabs.Tab>
        <Tabs.Tab value="b" count={3}>
          Unpaid
        </Tabs.Tab>
        <Tabs.Tab value="c" disabled icon={<svg />}>
          Archived
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
      <Tabs.Panel value="b">Panel B</Tabs.Panel>
      <Tabs.Panel value="c">Panel C</Tabs.Panel>
    </Tabs.Root>,
  );

describe('module graph', () => {
  test('the subpath reaches its leaf, the adapter, EngineLocale and the config, and the engine', () => {
    const { modules, externals } = graph(SRC, 'src/tabs/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/_engines/react-aria/locale.client.tsx',
      'src/_engines/react-aria/tabs.client.tsx',
      'src/config/config.client.tsx',
      'src/tabs/tabs.client.tsx',
    ]);
    expect([...externals].toSorted()).toEqual(['react', 'react-aria-components']);
  });

  test('the contract imports no engine (the public .d.ts never reaches one)', () => {
    const { externals } = graph(SRC, 'src/tabs/tabs.contract.ts');
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads and every example crosses with serialisable props only', async () => {
    const { loaded, react } = await underReactServer(
      () => Promise.all([import('../../src/tabs/index'), import('../../src/tabs/tabs.example')]),
      [LEAF, TEXTAREA],
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted((a, b) => a.localeCompare(b))).toEqual([
      'Tabs',
      'TabsList',
      'TabsPanel',
      'TabsRoot',
      'TabsTab',
    ]);
    const list = Object.values(examples);
    expect(list).toHaveLength(3);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.some((b) => b.client === 'TabsRoot')).toBe(true);
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

describe('markup', () => {
  test('a tablist of tabs; only the selected panel is rendered, labelled by its tab', () => {
    const html = markup();
    expect(errors).not.toHaveBeenCalled();
    expect(tag(html, /data-slot="tabs"/)).toBe('<div class="nz-tabs" data-slot="tabs">');
    const list = tag(html, /data-slot="tabs-list"/);
    expect(list).toContain('role="tablist"');
    expect(list).toContain('aria-label="Order status"');
    expect(list).toContain('aria-orientation="horizontal"');
    expect(list).toContain('class="nz-tabs-list"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain('Panel B');
    expect(html).not.toContain('Panel A');
    expect(html).not.toContain('Panel C');
    const tab = tag(html, /aria-selected="true"/);
    const panel = tag(html, /data-slot="tabs-panel"/);
    const tabId = / id="([^"]+)"/.exec(tab)?.[1];
    const panelId = / id="([^"]+)"/.exec(panel)?.[1];
    expect(tab).toContain(`aria-controls="${panelId}"`);
    expect(panel).toContain(`aria-labelledby="${tabId}"`);
    expect(panel).toContain('role="tabpanel"');
    expect(panel).toContain('class="nz-tabs-panel"');
  });

  test('each tab: slot, class, the inset focus mark, state attributes and the reserved bold label', () => {
    const html = markup();
    const tabs = parts(html).filter((part) => part.includes('data-slot="tabs-tab"'));
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(tab).toContain('class="nz-tabs-tab"');
      expect(tab).toContain('data-focus-inset=""');
    }
    expect(tabs[1]).toContain('data-selected=""');
    expect(tabs[2]).toContain('data-disabled=""');
    expect(tabs[2]).toContain('aria-disabled="true"');
    expect(html).toContain(
      '<span class="nz-tabs-label" data-slot="tabs-label"><span class="nz-tabs-text">Unpaid</span>' +
        '<span class="nz-tabs-sizer" aria-hidden="true">Unpaid</span></span>' +
        '<span class="nz-tabs-count" data-slot="tabs-count">3</span>',
    );
    expect(html).toContain(
      '<span class="nz-tabs-icon" data-slot="tabs-icon" aria-hidden="true"><svg></svg></span>',
    );
  });

  test('engine classes and attributes never reach a part (§9.3 rule 6)', () => {
    const html = markup();
    expect(html).not.toMatch(/react-aria-[A-Z]/);
    expect(html).not.toContain('data-rac');
    const outside = parts(html)
      .flatMap((part) => [...part.matchAll(/\s(data-[a-z0-9-]+)=/g)].map(([, name]) => name))
      .filter((name) => name !== undefined && !allowed.has(name));
    expect(outside).toEqual([]);
  });

  test('without a default, the first tab that is not disabled is selected', () => {
    const first = renderToString(
      <Tabs.Root>
        <Tabs.List aria-label="Views">
          <Tabs.Tab value="a" disabled>
            A
          </Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
        <Tabs.Panel value="b">Panel B</Tabs.Panel>
      </Tabs.Root>,
    );
    expect(tag(first, /aria-selected="true"/)).toContain('data-key="b"');
    expect(first).toContain('Panel B');
  });

  test('controlled: value selects its tab and panel', () => {
    const controlled = renderToString(
      <Tabs.Root value="b" onValueChange={() => undefined}>
        <Tabs.List aria-label="Views">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
        <Tabs.Panel value="b">Panel B</Tabs.Panel>
      </Tabs.Root>,
    );
    expect(tag(controlled, /aria-selected="true"/)).toContain('data-key="b"');
    expect(controlled).toContain('Panel B');
    expect(controlled).not.toContain('Panel A');
  });

  test('keepMounted: an unselected panel is in the HTML, hidden and inert', () => {
    const kept = renderToString(
      <Tabs.Root defaultValue="a">
        <Tabs.List aria-label="Views">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
        <Tabs.Panel value="b" keepMounted>
          Panel B
        </Tabs.Panel>
      </Tabs.Root>,
    );
    const panels = parts(kept).filter((part) => part.includes('data-slot="tabs-panel"'));
    expect(panels).toHaveLength(2);
    expect(panels[0]).toContain('role="tabpanel"');
    expect(panels[0]).not.toContain('hidden');
    expect(panels[1]).toContain('hidden=""');
    expect(panels[1]).toContain('inert=""');
    expect(kept).toContain('Panel B');
  });

  test('disabled on the root disables every tab; render keeps each part slot', () => {
    const custom = renderToString(
      <Tabs.Root defaultValue="a" disabled render={<div title="root" />}>
        <Tabs.List aria-label="Views" render={<div title="list" />}>
          <Tabs.Tab value="a" render={<div title="tab" />}>
            A
          </Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a" render={<div title="panel" />}>
          Panel A
        </Tabs.Panel>
      </Tabs.Root>,
    );
    expect(tag(custom, /data-slot="tabs"/)).toContain('title="root"');
    expect(tag(custom, /data-slot="tabs"/)).toContain('data-disabled=""');
    expect(tag(custom, /data-slot="tabs-list"/)).toContain('title="list"');
    expect(tag(custom, /title="tab"/)).toContain('data-slot="tabs-tab"');
    expect(tag(custom, /data-slot="tabs-panel"/)).toContain('title="panel"');
    const tabs = parts(custom).filter((part) => part.includes('data-slot="tabs-tab"'));
    for (const tab of tabs) expect(tab).toContain('aria-disabled="true"');
  });

  test('activationMode writes nothing to the DOM', () => {
    const manual = renderToString(<TabsManualExample />);
    expect(manual).not.toMatch(/activation|keyboard/i);
  });

  test('the examples render without errors, under an RTL locale too', () => {
    for (const Example of [TabsExample, TabsStatesExample, TabsManualExample]) {
      expect(renderToString(<Example />).length).toBeGreaterThan(0);
    }
    const rtl = renderToString(
      <NizivoConfig locale="ar-EG">
        <TabsExample />
      </NizivoConfig>,
    );
    expect(rtl).toContain('role="tablist"');
    expect(errors).not.toHaveBeenCalled();
  });
});

// Tabs (ARCHITECTURE.md §9.2, §9.5; figma/13 §4.4): WAI-ARIA tabs on the React Aria engine. Module
// graph, RSC boundary and server markup: the selected panel is in the HTML, engine attributes are
// not. Keyboard, RTL and hydration run in a browser: test/browser/tabs.spec.tsx.
import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { useLocale } from 'react-aria-components';
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

/** The locale and direction React Aria gives the content it is placed in. */
function Probe(): JSX.Element {
  const { locale, direction } = useLocale();
  return <output data-locale={locale}>{direction}</output>;
}

/**
 * A tab element that reports what the tab list resolved: its locale and the direction the arrows
 * follow. It renders inside the list's direction carrier, around the tab's content.
 */
function CarrierTab(props: Record<string, unknown>): JSX.Element {
  const { locale, direction } = useLocale();
  return <div {...props} data-carrier={`${locale} ${direction}`} />;
}

function Strip({ dir }: { dir?: 'ltr' | 'rtl' }): JSX.Element {
  return (
    <Tabs.Root defaultValue="a" {...(dir === undefined ? {} : { dir })}>
      <Tabs.List aria-label="Views">
        <Tabs.Tab value="a" render={(props) => <CarrierTab {...props} />}>
          A
        </Tabs.Tab>
        <Tabs.Tab value="b">B</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
    </Tabs.Root>
  );
}

/** The root's `dir` attribute (or null), and the locale and direction the tab list resolved. */
function resolved(html: string): { attr: string | null; locale: string; direction: string } {
  const root = tag(html, /data-slot="tabs"/);
  const probe = / data-carrier="([^" ]+) (ltr|rtl)"/.exec(html);
  if (probe === null) throw new Error('no probe');
  return {
    attr: / dir="([^"]+)"/.exec(root)?.[1] ?? null,
    locale: probe[1] ?? '',
    direction: probe[2] ?? '',
  };
}

describe("direction (M26): the part's dir, else the NizivoConfig scope's locale", () => {
  test('without dir: the scope locale decides and the markup has no dir attribute', () => {
    expect(resolved(renderToString(<Strip />))).toEqual({
      attr: null,
      locale: 'en-US',
      direction: 'ltr',
    });
    expect(
      resolved(
        renderToString(
          <NizivoConfig locale="ar-EG">
            <Strip />
          </NizivoConfig>,
        ),
      ),
    ).toEqual({ attr: null, locale: 'ar-EG', direction: 'rtl' });
  });

  test('scope ltr, local rtl: the part wins and renders its dir', () => {
    expect(
      resolved(
        renderToString(
          <NizivoConfig locale="de-DE">
            <Strip dir="rtl" />
          </NizivoConfig>,
        ),
      ),
    ).toEqual({ attr: 'rtl', locale: 'ar', direction: 'rtl' });
  });

  test('scope rtl, local ltr: the part wins and renders its dir', () => {
    for (const locale of ['ar-EG', 'he-IL', 'fa-IR']) {
      expect(
        resolved(
          renderToString(
            <NizivoConfig locale={locale}>
              <Strip dir="ltr" />
            </NizivoConfig>,
          ),
        ),
      ).toEqual({ attr: 'ltr', locale: 'en', direction: 'ltr' });
    }
  });

  test('a dir the scope locale already has leaves the locale untouched', () => {
    expect(
      resolved(
        renderToString(
          <NizivoConfig locale="ar-EG">
            <Strip dir="rtl" />
          </NizivoConfig>,
        ),
      ),
    ).toEqual({ attr: 'rtl', locale: 'ar-EG', direction: 'rtl' });
    expect(resolved(renderToString(<Strip dir="ltr" />))).toEqual({
      attr: 'ltr',
      locale: 'en-US',
      direction: 'ltr',
    });
  });

  test('nested scopes: the nearest NizivoConfig decides, and a local dir still wins', () => {
    expect(
      resolved(
        renderToString(
          <NizivoConfig locale="ar-EG">
            <NizivoConfig locale="en-GB">
              <Strip />
            </NizivoConfig>
          </NizivoConfig>,
        ),
      ),
    ).toEqual({ attr: null, locale: 'en-GB', direction: 'ltr' });
    expect(
      resolved(
        renderToString(
          <NizivoConfig locale="en-GB">
            <NizivoConfig locale="he-IL">
              <Strip />
            </NizivoConfig>
          </NizivoConfig>,
        ),
      ),
    ).toEqual({ attr: null, locale: 'he-IL', direction: 'rtl' });
    expect(
      resolved(
        renderToString(
          <NizivoConfig locale="en-GB">
            <NizivoConfig locale="he-IL">
              <Strip dir="ltr" />
            </NizivoConfig>
          </NizivoConfig>,
        ),
      ),
    ).toEqual({ attr: 'ltr', locale: 'en', direction: 'ltr' });
    expect(errors).not.toHaveBeenCalled();
  });

  test('only the tab list carries the direction: a panel keeps the scope locale', () => {
    const html = renderToString(
      <NizivoConfig locale="de-DE">
        <Tabs.Root defaultValue="a" dir="rtl">
          <Tabs.List aria-label="Views">
            <Tabs.Tab value="a">A</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a">
            <Probe />
          </Tabs.Panel>
        </Tabs.Root>
      </NizivoConfig>,
    );
    expect(html).toContain('<output data-locale="de-DE">ltr</output>');
  });

  test("a tab's content keeps the scope locale; only the list's own hooks get the carrier", () => {
    const html = renderToString(
      <NizivoConfig locale="en-US">
        <Tabs.Root defaultValue="a" dir="rtl">
          <Tabs.List aria-label="Views">
            <Tabs.Tab value="a" render={(props) => <CarrierTab {...props} />}>
              <Probe />
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a">Panel A</Tabs.Panel>
        </Tabs.Root>
      </NizivoConfig>,
    );
    expect(html).toContain('data-carrier="ar rtl"');
    expect(html).toContain('<output data-locale="en-US">ltr</output>');
  });

  test('a root without dir inherits the nearest Tabs dir, and renders no attribute of its own', () => {
    const html = renderToString(
      <NizivoConfig locale="en-US">
        <Tabs.Root defaultValue="a" dir="rtl">
          <Tabs.List aria-label="Outer">
            <Tabs.Tab value="a">A</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a">
            <Strip />
          </Tabs.Panel>
        </Tabs.Root>
      </NizivoConfig>,
    );
    const inner = parts(html).filter((part) => /data-slot="tabs"/.test(part))[1];
    expect(inner).toBeDefined();
    expect(inner).not.toContain(' dir=');
    expect(/ data-carrier="([^"]+)"/.exec(html)?.[1]).toBe('ar rtl');
    // its own dir still wins over the inherited one
    const own = renderToString(
      <Tabs.Root defaultValue="a" dir="rtl">
        <Tabs.List aria-label="Outer">
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">
          <Strip dir="ltr" />
        </Tabs.Panel>
      </Tabs.Root>,
    );
    expect(/ data-carrier="([^"]+)"/.exec(own)?.[1]).toBe('en-US ltr');
  });

  test('render keeps dir on the root element', () => {
    const html = renderToString(
      <Tabs.Root defaultValue="a" dir="rtl" render={<div title="root" />}>
        <Tabs.List aria-label="Views">
          <Tabs.Tab value="a">A</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
      </Tabs.Root>,
    );
    const root = tag(html, /data-slot="tabs"/);
    expect(root).toContain('dir="rtl"');
    expect(root).toContain('title="root"');
  });
});

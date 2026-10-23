// The shell (M49; figma/06 §6.2 and §6.8, figma/08 §7 and §8.1): Sidebar, TopBar, MobileTopBar,
// MobileTabBar and AppShell. Module graphs (four server-only subpaths; MobileTabBar's two islands),
// the server markup, and only vocabulary attributes on the parts. Layout, the rail, the More sheet
// and the bottom inset run in a browser: test/browser/app-shell.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import allowlist from '../../src/_engines/react-aria/dom-allowlist.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';
import { AppShell } from '../../src/app-shell/index';
import { AppShellExample } from '../../src/app-shell/app-shell.example';
import { MobileTabBar, MobileTabBarMore } from '../../src/mobile-tab-bar/index';
import { MobileTabBarExample } from '../../src/mobile-tab-bar/mobile-tab-bar.example';
import { MobileTopBar } from '../../src/mobile-top-bar/index';
import { MobileTopBarExample } from '../../src/mobile-top-bar/mobile-top-bar.example';
import { Sidebar } from '../../src/sidebar/index';
import { SidebarExample, SidebarRailExample } from '../../src/sidebar/sidebar.example';
import { TopBar } from '../../src/top-bar/index';
import { TopBarExample } from '../../src/top-bar/top-bar.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

/** The vocabulary, and the engine attributes React Aria reads back (More is its Drawer's trigger). */
const ALLOWED = new Set([
  ...Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
  ...allowlist.attributes,
]);

/** The `data-*` names on every documented part (an element with `data-slot`). */
function partAttributes(html: string): string[] {
  const names = new Set<string>();
  for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
    for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) if (name) names.add(name);
  }
  return [...names];
}

describe('module graphs', () => {
  test('TopBar, MobileTopBar and AppShell reach no client module', () => {
    for (const name of ['top-bar', 'mobile-top-bar', 'app-shell']) {
      const { modules } = graph(SRC, `src/${name}/index.ts`);
      expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    }
  });

  test("Sidebar's parts are server parts; SidebarItem is its one client export", () => {
    const { modules } = graph(SRC, 'src/sidebar/sidebar.tsx');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
  });

  test("MobileTabBar's server parts render the inset island; More is its own client export", () => {
    const { modules } = graph(SRC, 'src/mobile-tab-bar/mobile-tab-bar.tsx');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/mobile-tab-bar/mobile-tab-bar-inset.client.tsx',
    ]);
  });
});

describe('Sidebar', () => {
  test('a <nav> named Primary; collapsed sets data-collapsed, collapsed={false} data-expanded', () => {
    expect(renderToString(<Sidebar.Root />)).toBe(
      '<nav aria-label="Primary" data-slot="sidebar" class="nz-sidebar"></nav>',
    );
    expect(renderToString(<Sidebar.Root collapsed />)).toContain('data-collapsed=""');
    expect(renderToString(<Sidebar.Root collapsed={false} />)).toContain('data-expanded=""');
    expect(renderToString(<Sidebar.Root aria-label="Store" labels={{ nav: 'x' }} />)).toContain(
      'aria-label="Store"',
    );
  });

  test('the header: the mark, then the name over the description; the footer after the content', () => {
    const html = renderToString(<SidebarExample />);
    const order = [
      'sidebar-header-mark',
      'sidebar-header-title',
      'sidebar-header-description',
      'sidebar-content',
      'sidebar-footer',
    ].map((slot) => html.indexOf(`data-slot="${slot}"`));
    expect(order.every((at) => at > 0)).toBe(true);
    expect(order.toSorted((a, b) => a - b)).toEqual(order);
    expect(html).toContain('aria-current="page"');
    expect(renderToString(<Sidebar.Header title="Moss" />)).not.toContain('sidebar-header-mark');
  });

  test('only vocabulary attributes on its parts', () => {
    for (const html of [renderToString(<SidebarExample />), renderToString(<SidebarRailExample />)])
      expect(partAttributes(html).filter((name) => !ALLOWED.has(name))).toEqual([]);
  });
});

describe('TopBar and MobileTopBar', () => {
  test('a <header> whose title is text, not a heading (the PageHeader holds the <h1>)', () => {
    expect(renderToString(<TopBar title="Overview" />)).toBe(
      '<header data-slot="top-bar" class="nz-top-bar"><div class="nz-top-bar-start" data-slot="top-bar-start"><span class="nz-top-bar-title" data-slot="top-bar-title">Overview</span></div></header>',
    );
    expect(renderToString(<TopBar title="Overview" start={<nav>Trail</nav>} />)).not.toContain(
      'Overview',
    );
    for (const html of [renderToString(<TopBarExample />), renderToString(<MobileTopBarExample />)])
      expect(html).not.toMatch(/<h[1-6]/);
  });

  test('MobileTopBar: the mark, the title, the actions; leading replaces the mark', () => {
    const html = renderToString(<MobileTopBarExample />);
    expect(html.indexOf('mobile-top-bar-mark')).toBeLessThan(html.indexOf('mobile-top-bar-title'));
    expect(html.indexOf('mobile-top-bar-title')).toBeLessThan(
      html.indexOf('mobile-top-bar-actions'),
    );
    const back = renderToString(<MobileTopBar mark="M" leading={<a href="/orders">Back</a>} />);
    expect(back).toContain('<a href="/orders">Back</a>');
    expect(back).not.toContain('mobile-top-bar-mark');
  });
});

describe('MobileTabBar', () => {
  test('links in a list in a <nav>; the current one is aria-current="page"', () => {
    const html = renderToString(
      <MobileTabBar.Root>
        <MobileTabBar.Item href="/" icon="H" current>
          Home
        </MobileTabBar.Item>
      </MobileTabBar.Root>,
    );
    expect(html).toBe(
      '<nav aria-label="Primary" data-slot="mobile-tab-bar" class="nz-mobile-tab-bar"><ul class="nz-mobile-tab-bar-list" data-slot="mobile-tab-bar-list"><li class="nz-mobile-tab-bar-item" data-slot="mobile-tab-bar-item"><a data-slot="mobile-tab-bar-link" href="/" aria-current="page" class="nz-mobile-tab-bar-link"><span class="nz-mobile-tab-bar-indicator" data-slot="mobile-tab-bar-indicator"><span class="nz-mobile-tab-bar-icon" aria-hidden="true">H</span></span><span class="nz-mobile-tab-bar-label" data-slot="mobile-tab-bar-label">Home</span></a></li></ul><span hidden=""></span></nav>',
    );
  });

  test('More: a button in the list that opens a dialog; the sheet is not in the server HTML', () => {
    const html = renderToString(
      <MobileTabBar.Root>
        <MobileTabBarMore current>
          <a href="/settings">Settings</a>
        </MobileTabBarMore>
      </MobileTabBar.Root>,
    );
    expect(html).toMatch(
      /<li class="nz-mobile-tab-bar-more" data-slot="mobile-tab-bar-more"><button [^>]*type="button"/,
    );
    expect(html).toMatch(/<button [^>]*aria-expanded="false"/);
    expect(html).toMatch(/<button [^>]*data-slot="mobile-tab-bar-more-trigger"/);
    expect(html).toMatch(/<button [^>]*data-current=""/);
    expect(html).toContain('>More</span>');
    expect(html).not.toContain('Settings');
  });

  test('only vocabulary attributes on its parts', () => {
    expect(
      partAttributes(renderToString(<MobileTabBarExample />)).filter((name) => !ALLOWED.has(name)),
    ).toEqual([]);
  });
});

describe('AppShell', () => {
  test('the skip link first, to the <main> it owns; each slot in its own frame', () => {
    const html = renderToString(
      <AppShell mainId="page" sidebar="S" topBar="T" mobileTopBar="M" tabBar="B">
        Page
      </AppShell>,
    );
    expect(html).toBe(
      '<div data-slot="app-shell" class="nz-app-shell"><a class="nz-app-shell-skip" data-slot="app-shell-skip" href="#page">Skip to content</a><div class="nz-app-shell-sidebar" data-slot="app-shell-sidebar">S</div><div class="nz-app-shell-frame" data-slot="app-shell-frame"><div class="nz-app-shell-top-bar" data-slot="app-shell-top-bar">T</div><div class="nz-app-shell-mobile-top-bar" data-slot="app-shell-mobile-top-bar">M</div><main id="page" tabindex="-1" class="nz-app-shell-main" data-slot="app-shell-main">Page</main></div><div class="nz-app-shell-tab-bar" data-slot="app-shell-tab-bar">B</div></div>',
    );
  });

  test('without mainId, the skip link points at a generated id that is a valid fragment', () => {
    const html = renderToString(<AppShell>Page</AppShell>);
    const [, target] = /href="#([^"]+)"/.exec(html) ?? [];
    expect(target).toMatch(/^[\w-]+$/);
    expect(html).toContain(`<main id="${target ?? ''}"`);
    expect(html).not.toContain('app-shell-sidebar');
  });

  test('the example: one <main>, no heading in a bar, only vocabulary attributes', () => {
    const html = renderToString(<AppShellExample />);
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(partAttributes(html).filter((name) => !ALLOWED.has(name))).toEqual([]);
  });
});

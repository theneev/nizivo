// Node-side overlay conformance (ARCHITECTURE.md §9.3 rules 4 and 6, §12.2 SSR, §12.5 O-17): the
// react-aria family's OverlayEngine, the engine-free contracts, and the server render of every overlay
// closed and opened with defaultOpen. The browser cases are the *.spec.tsx files in this folder.
import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import allowlist from '../../src/_engines/react-aria/dom-allowlist.json' with { type: 'json' };
import { engineDom } from '../../src/_engines/react-aria/dom';
import {
  markTopLayer,
  overlayEngine,
  OverlayScope,
  popupStyle,
  resolveSide,
  toPlacement,
} from '../../src/_engines/react-aria/overlay.client';
import { Dialog } from '../../src/dialog/index';
import { Menu } from '../../src/menu/index';
import {
  MenuCheckboxExample,
  MenuExample,
  MenuOpenExample,
  MenuRowActionsExample,
} from '../../src/menu/menu.example';
import { Select } from '../../src/select/index';
import { Tooltip } from '../../src/tooltip/index';
import { graph, rekey } from '../helpers/graph';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);
const ENGINE =
  /^(react-aria|react-aria-components|react-stately|@react-aria\/|@react-stately\/|@internationalized\/)/;
const OVERLAYS = ['select', 'dialog', 'tooltip', 'menu'] as const;

describe('the react-aria OverlayEngine (§12.2)', () => {
  test('is one object whose members are the functions the adapters import by name', () => {
    expect(overlayEngine).toEqual({
      Scope: OverlayScope,
      markTopLayer,
      toPlacement,
      resolveSide,
      popupStyle,
      delegated: ['inert', 'scroll-lock', 'dismiss-stack', 'focus-return'],
      completes: ['tab-out', 'return-focus', 'initial-focus', 'nested-top-layer'],
    });
  });

  test('markTopLayer maps data-nz-top-layer to the engine exemption and undoes it', () => {
    const attributes = new Map<string, string>();
    const fake = {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    };
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the node lane has no DOM
    const element = fake as unknown as Element;
    const undo = markTopLayer(element);
    expect([...attributes.keys()]).toEqual(['data-react-aria-top-layer']);
    expect(allowlist.attributes).toContain('data-react-aria-top-layer');
    undo();
    expect(attributes.size).toBe(0);
  });

  test('the family module imports only types from the components barrel, so Tooltip stays light', () => {
    // Tooltip imports overlay.client; a value import from react-aria-components here put React Aria's
    // Popover and Dialog modules on every Tooltip docs page under Turbopack (week 4, +39 KB gzip).
    // The modal-popup helpers that read React Aria's contexts live in popup.client.tsx.
    const source = SRC.get('src/_engines/react-aria/overlay.client.tsx') ?? '';
    const barrel = [...source.matchAll(/^import (type )?[^;]*?from 'react-aria-components';/gms)];
    expect(barrel.length).toBeGreaterThan(0);
    expect(barrel.every((m) => m[1] === 'type ')).toBe(true);
    const tooltip = SRC.get('src/_engines/react-aria/tooltip.client.tsx') ?? '';
    expect(tooltip).not.toContain("from './popup.client'");
  });

  for (const name of OVERLAYS) {
    test(`the ${name} adapter takes the shared mechanics from the family module only`, () => {
      const source = SRC.get(`src/_engines/react-aria/${name}.client.tsx`) ?? '';
      expect(source).toContain("from './overlay.client'");
      // No adapter brings its own portal provider or position hook (one overlay core per family).
      expect(source).not.toMatch(/PortalProvider|useOverlayPosition|usePreventScroll/);
    });
  }
});

describe('engineDom on Menu render props (§9.3 rule 6, D-f)', () => {
  test('keeps the link family React Aria reads back and drops the menu state attributes', () => {
    expect(
      engineDom({
        className: 'react-aria-MenuItem',
        'data-rac': '',
        'data-has-submenu': true,
        'data-selection-mode': 'single',
        'data-open': true,
        'data-selected': true,
        'data-focused': true,
        'data-href': '/orders',
        'data-target': '_blank',
        'data-key': 'edit',
        role: 'menuitemradio',
        'aria-checked': true,
      }),
    ).toEqual({
      'data-href': '/orders',
      'data-target': '_blank',
      'data-key': 'edit',
      role: 'menuitemradio',
      'aria-checked': true,
    });
  });
});

describe('no engine types in the public contracts (§9.3 rule 4)', () => {
  for (const name of OVERLAYS) {
    test(`${name}.contract.ts reaches no engine and no _engines file`, () => {
      const { modules, externals } = graph(SRC, `src/${name}/${name}.contract.ts`);
      expect([...modules].filter((file) => file.startsWith('src/_engines/'))).toEqual([]);
      expect([...externals].filter((specifier) => ENGINE.test(specifier))).toEqual([]);
    });
  }

  test('the OverlayEngine interface is engine-free', () => {
    const { modules, externals } = graph(SRC, 'src/_internal/overlay.ts');
    expect([...modules].filter((file) => file.startsWith('src/_engines/'))).toEqual([]);
    expect([...externals].filter((specifier) => ENGINE.test(specifier))).toEqual([]);
  });
});

const allowed = new Set([
  ...Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
  ...allowlist.attributes,
]);

function partAttributes(html: string): string[] {
  const names = new Set<string>();
  for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
    for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) if (name) names.add(name);
  }
  return [...names];
}

describe('SSR (§12.2: closed overlays render nothing; O-17)', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  const cases: Record<
    string,
    { app: (open: boolean) => JSX.Element; trigger: string; popup: string }
  > = {
    Select: {
      app: (open) => (
        <Select.Root aria-label="Period" defaultOpen={open}>
          <Select.Trigger />
          <Select.Popup>
            <Select.Item value="7d">Last 7 days</Select.Item>
          </Select.Popup>
        </Select.Root>
      ),
      trigger: 'select-trigger',
      popup: 'select-popup',
    },
    Dialog: {
      app: (open) => (
        <Dialog.Root defaultOpen={open}>
          <Dialog.Trigger>Edit</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Edit</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
      ),
      trigger: 'dialog-trigger',
      popup: 'dialog-popup',
    },
    Tooltip: {
      app: (open) => (
        <Tooltip.Root defaultOpen={open}>
          <Tooltip.Trigger>Export</Tooltip.Trigger>
          <Tooltip.Popup>Download</Tooltip.Popup>
        </Tooltip.Root>
      ),
      trigger: 'tooltip-trigger',
      popup: 'tooltip-popup',
    },
    Menu: {
      app: (open) => (
        <Menu.Root defaultOpen={open}>
          <Menu.Trigger>Sort</Menu.Trigger>
          <Menu.Popup>
            <Menu.Item>Newest first</Menu.Item>
          </Menu.Popup>
        </Menu.Root>
      ),
      trigger: 'menu-trigger',
      popup: 'menu-popup',
    },
  };

  for (const [name, { app, trigger, popup }] of Object.entries(cases)) {
    test(`${name}: closed and defaultOpen render the trigger only, inside the vocabulary`, () => {
      for (const open of [false, true]) {
        const html = renderToString(app(open));
        expect(html).toContain(`data-slot="${trigger}"`);
        expect(html).not.toContain(`data-slot="${popup}"`);
        expect(html).not.toMatch(/react-aria-[A-Z]/);
        expect(partAttributes(html).filter((attr) => !allowed.has(attr))).toEqual([]);
      }
      expect(errors).not.toHaveBeenCalled();
    });
  }

  test('Menu: the trigger names its popup, carries its state, and never reports an open trigger as pressed', () => {
    const closed = renderToString(<MenuExample />);
    expect(closed).toMatch(
      /<button[^>]*class="nz-button nz-hit-target nz-menu-trigger"[^>]*>|<button[^>]*data-slot="menu-trigger"/,
    );
    expect(closed).toContain('aria-haspopup="true"');
    expect(closed).toContain('aria-expanded="false"');
    const open = renderToString(<MenuOpenExample />);
    expect(open).toMatch(/data-slot="menu-trigger"[^>]*data-open=""/);
    expect(open).not.toContain('data-pressed');
  });

  test('Menu: every example renders on the server without errors', () => {
    for (const Example of [
      MenuExample,
      MenuRowActionsExample,
      MenuCheckboxExample,
      MenuOpenExample,
    ]) {
      expect(renderToString(<Example />).length).toBeGreaterThan(0);
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

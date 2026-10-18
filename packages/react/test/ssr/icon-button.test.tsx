// IconButton (ARCHITECTURE.md §9.5 "split", §10.2): the server shell, the tooltip leaf across the RSC
// boundary, and the markup both paths share; IconButtonStatic (M31), the same element from a module
// that reaches no client code. Tooltip behaviour in a browser: test/browser/icon-button.spec.tsx.
import { isValidElement, type MouseEvent } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  graph,
  isClient,
  reactImports,
  REACT_SERVER,
  rekey,
  resolve,
  specifiers,
} from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { IconButton } from '../../src/icon-button/icon-button';
import { IconButtonTooltip } from '../../src/icon-button/icon-button.client';
import { IconButtonStatic, iconButtonElement } from '../../src/icon-button/icon-button-static';
import type { IconButtonStaticProps } from '../../src/icon-button/icon-button.contract';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

const LEAF = {
  path: new URL('../../src/icon-button/icon-button.client.tsx', import.meta.url).pathname,
  exports: ['IconButtonTooltip'],
};

const Mark = <svg viewBox="0 0 24 24" />;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('module graph', () => {
  test('the shell, up to its client leaf, imports only react-server React', () => {
    // The server side of a split component: everything the shell reaches before a 'use client' module.
    const server = new Set<string>();
    const queue = ['src/icon-button/icon-button.tsx'];
    while (queue.length > 0) {
      const file = queue.pop() ?? '';
      if (server.has(file) || isClient(SRC.get(file) ?? '')) continue;
      server.add(file);
      for (const specifier of specifiers(SRC.get(file) ?? '')) {
        const target = specifier.startsWith('.') ? resolve(SRC, file, specifier) : undefined;
        if (target !== undefined) queue.push(target);
      }
    }
    expect([...server]).toEqual(
      expect.arrayContaining([
        'src/icon-button/icon-button.tsx',
        'src/icon-button/icon-button.contract.ts',
      ]),
    );
    expect(reactImports(SRC, server).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test("the subpath's first client modules are the leaf and the Tooltip it renders", () => {
    const { modules } = graph(SRC, 'src/icon-button/index.ts');
    const clients = [...modules].filter((file) => isClient(SRC.get(file) ?? ''));
    expect(clients).toEqual(
      expect.arrayContaining([
        'src/icon-button/icon-button.client.tsx',
        'src/tooltip/tooltip.client.tsx',
      ]),
    );
    expect(clients.every((file) => file.endsWith('.client.tsx'))).toBe(true);
  });

  test('IconButtonStatic reaches no client module, no package but react, and only react-server React', () => {
    const { modules, externals } = graph(SRC, 'src/icon-button/icon-button-static.tsx');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...modules]).not.toContain('src/icon-button/icon-button.tsx');
    expect([...externals]).toEqual(['react']);
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('react-server build, the leaf as a client reference', () => {
  test('tooltip={false} renders host elements and crosses no boundary', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/icon-button/icon-button'),
      [LEAF],
    );
    const boundaries: ClientBoundary[] = [];
    const tree = JSON.stringify(
      withDispatcher(react, () =>
        serverRender(
          loaded.IconButton({ label: 'Delete', icon: Mark, tooltip: false }),
          boundaries,
        ),
      ),
    );
    expect(boundaries).toEqual([]);
    expect(tree).toContain('"data-slot":"icon-button"');
    expect(tree).toContain('"aria-label":"Delete"');
  });

  test('the default tooltip hands the leaf only serialisable props', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/icon-button/icon-button'),
      [LEAF],
    );
    const boundaries: ClientBoundary[] = [];
    withDispatcher(react, () =>
      serverRender(
        loaded.IconButton({
          label: 'Bold',
          icon: Mark,
          variant: 'tertiary',
          pressed: true,
          shortcut: 'mod+b',
          tooltip: { side: 'bottom' },
        }),
        boundaries,
      ),
    );
    expect(boundaries.map((boundary) => boundary.client)).toEqual(['IconButtonTooltip']);
    const [leaf] = boundaries;
    expect(leaf?.props).toMatchObject({
      label: 'Bold',
      variant: 'tertiary',
      pressed: true,
      shortcut: 'mod+b',
      'aria-keyshortcuts': 'Meta+B Control+B',
      tooltip: { side: 'bottom' },
    });
    expect(unserialisable(leaf?.props)).toEqual([]);
  });

  test('every example loads and renders under react-server', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/icon-button/icon-button.example'),
      [LEAF],
    );
    const examples = Object.values(loaded);
    expect(examples).toHaveLength(5);
    for (const Example of examples) {
      const boundaries: ClientBoundary[] = [];
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example(), boundaries)));
      for (const boundary of boundaries) {
        expect(boundary.client).toBe('IconButtonTooltip');
        expect(unserialisable(boundary.props)).toEqual([]);
      }
      expect(tree.includes('"data-slot":"icon-button"') || boundaries.length > 0).toBe(true);
    }
  });
});

const PLAIN =
  '<button data-slot="icon-button" data-variant="secondary" data-size="md" class="nz-icon-button nz-hit-target" type="button" aria-label="Notifications">' +
  '<span class="nz-icon-button-icon" data-slot="icon-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"></svg></span></button>';

describe('IconButtonStatic under the react-server build', () => {
  test('loads with no client module mocked and renders host elements only', async () => {
    // No client reference is registered: a 'use client' module anywhere in the graph would fail to load.
    const { loaded, react } = await underReactServer(
      () => import('../../src/icon-button/icon-button-static'),
    );
    const boundaries: ClientBoundary[] = [];
    const tree = JSON.stringify(
      withDispatcher(react, () =>
        serverRender(
          loaded.IconButtonStatic({ 'aria-label': 'Delete', icon: Mark, pending: true }),
          boundaries,
        ),
      ),
    );
    expect(boundaries).toEqual([]);
    expect(tree).toContain('"data-slot":"icon-button"');
    expect(tree).toContain('"aria-label":"Delete"');
  });
});

describe('markup', () => {
  test('a secondary md button named by its label, with a decorative glyph', () => {
    expect(renderToString(<IconButton label="Notifications" icon={Mark} tooltip={false} />)).toBe(
      PLAIN,
    );
  });

  test('the tooltip path renders the same server HTML: the tooltip adds behaviour only', () => {
    expect(renderToString(<IconButton label="Notifications" icon={Mark} />)).toBe(PLAIN);
    expect(
      renderToString(
        <IconButtonTooltip label="Notifications" icon={Mark} tooltip={{}} shortcut="mod+n" />,
      ),
    ).toBe(PLAIN);
  });

  test('a shortcut is announced through aria-keyshortcuts, on both paths; an own value wins', () => {
    for (const tooltip of [true, false]) {
      expect(
        renderToString(<IconButton label="Bold" icon={Mark} shortcut="mod+b" tooltip={tooltip} />),
      ).toContain('aria-keyshortcuts="Meta+B Control+B"');
    }
    expect(
      renderToString(<IconButton label="Find" icon={Mark} shortcut="ctrl+shift+f" />),
    ).toContain('aria-keyshortcuts="Control+Shift+F"');
    expect(
      renderToString(
        <IconButton label="Bold" icon={Mark} shortcut="mod+b" aria-keyshortcuts="Alt+B" />,
      ),
    ).toContain('aria-keyshortcuts="Alt+B"');
    expect(renderToString(<IconButton label="Bold" icon={Mark} />)).not.toContain(
      'aria-keyshortcuts',
    );
  });

  test('variant and size are data attributes', () => {
    const html = renderToString(
      <IconButton label="Add" icon={Mark} variant="primary" size="lg" tooltip={false} />,
    );
    expect(html).toMatch(/^<button data-slot="icon-button" data-variant="primary" data-size="lg" /);
  });

  test('pressed makes a toggle: aria-pressed is written as given, and absent without it', () => {
    expect(
      renderToString(<IconButton label="Bold" icon={Mark} pressed tooltip={false} />),
    ).toContain('aria-pressed="true"');
    expect(
      renderToString(<IconButton label="Bold" icon={Mark} pressed={false} tooltip={false} />),
    ).toContain('aria-pressed="false"');
    expect(renderToString(<IconButton label="Bold" icon={Mark} tooltip={false} />)).not.toContain(
      'aria-pressed',
    );
  });

  test('pending: focusable, aria-disabled, never a submit, and the spinner replaces the glyph', () => {
    const html = renderToString(
      <IconButton label="Delete" icon={Mark} pending type="submit" disabled tooltip={false} />,
    );
    expect(html).toContain('data-pending=""');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/ disabled=""/);
    expect(html).toContain('nz-glyph-spinner');
    expect(html).not.toContain('viewBox="0 0 24 24"></svg>');
  });

  test('disabled is the native attribute on a button', () => {
    const html = renderToString(<IconButton label="Delete" icon={Mark} disabled tooltip={false} />);
    expect(html).toContain('data-disabled=""');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('aria-disabled');
  });

  test('render: a link keeps the name and slot and gets no type or disabled', () => {
    const html = renderToString(
      <IconButton
        label="Settings"
        icon={Mark}
        render={<a href="/settings" aria-label="Settings" />}
        disabled
        tooltip={false}
      />,
    );
    expect(html).toMatch(/^<a [^>]*data-slot="icon-button"/);
    expect(html).toContain('href="/settings"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('type=');
  });

  test("the consumer's aria-labelledby names the button; aria-label stays as a fallback", () => {
    const html = renderToString(
      <IconButton label="Close" icon={Mark} aria-labelledby="dialog-title" tooltip={false} />,
    );
    expect(html).toContain('aria-labelledby="dialog-title"');
    expect(html).toContain('aria-label="Close"');
  });
});

describe('IconButtonStatic markup equals <IconButton tooltip={false}>', () => {
  const cases: [string, Omit<IconButtonStaticProps, 'aria-label' | 'icon'>][] = [
    ['the defaults', {}],
    ['each variant and size', { variant: 'primary', size: 'lg' }],
    ['tertiary sm', { variant: 'tertiary', size: 'sm' }],
    ['critical', { variant: 'critical' }],
    ['accent', { variant: 'accent' }],
    ['a pressed toggle', { pressed: true }],
    ['an unpressed toggle', { pressed: false }],
    ['pending, which is never a submit', { pending: true, type: 'submit' }],
    ['a custom pending indicator', { pending: true, pendingIndicator: <svg data-mark="" /> }],
    ['disabled', { disabled: true }],
    ['a submit button', { type: 'submit', name: 'intent', value: 'delete' }],
    ['a link', { render: <a href="/settings" aria-label="Settings" />, disabled: true }],
    ['aria-labelledby, with aria-label as the fallback', { 'aria-labelledby': 'title' }],
    ['own attributes and class', { id: 'x', className: 'mine', 'aria-keyshortcuts': 'Alt+B' }],
  ];
  test.each(cases)('%s', (_name, props) => {
    expect(renderToString(<IconButtonStatic aria-label="Delete" icon={Mark} {...props} />)).toBe(
      renderToString(<IconButton label="Delete" icon={Mark} tooltip={false} {...props} />),
    );
  });

  test('the plain button', () => {
    expect(renderToString(<IconButtonStatic aria-label="Notifications" icon={Mark} />)).toBe(PLAIN);
  });

  test('types: a name is required, and the tooltip props are refused', () => {
    // @ts-expect-error -- no accessible name
    const unnamed = <IconButtonStatic icon={Mark} />;
    // @ts-expect-error -- `label` is IconButton's; IconButtonStatic is named by aria-label
    const labelled = <IconButtonStatic label="Delete" aria-label="Delete" icon={Mark} />;
    // @ts-expect-error -- there is no tooltip: use IconButton
    const tooltip = <IconButtonStatic aria-label="Delete" icon={Mark} tooltip={false} />;
    // @ts-expect-error -- no shortcut: pass aria-keyshortcuts
    const shortcut = <IconButtonStatic aria-label="Bold" icon={Mark} shortcut="mod+b" />;
    const labelledBy = <IconButtonStatic aria-label="Close" aria-labelledby="title" icon={Mark} />;
    expect([unnamed, labelled, tooltip, shortcut, labelledBy].every((e) => isValidElement(e))).toBe(
      true,
    );
  });

  test('an empty aria-label warns in development, unless aria-labelledby names it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderToString(<IconButtonStatic aria-label=" " icon={Mark} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toBe(
      'Nizivo IconButtonStatic: `aria-label` is empty, so the button has no accessible name. Pass the action in words, for example aria-label="Delete product".',
    );
    renderToString(<IconButtonStatic aria-label="" aria-labelledby="title" icon={Mark} />);
    renderToString(<IconButtonStatic aria-label="Delete" icon={Mark} />);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

/** The element's click handler, as React would call it. */
function clickOf(element: unknown): (event: Partial<MouseEvent>) => void {
  if (!isValidElement<{ onClick?: (event: Partial<MouseEvent>) => void }>(element)) {
    throw new Error('not an element');
  }
  const handler = element.props.onClick;
  if (handler === undefined) throw new Error('no onClick');
  return handler;
}

describe('behaviour', () => {
  test('a pending button swallows the click', () => {
    const onClick = vi.fn<() => void>();
    const preventDefault = vi.fn<() => void>();
    clickOf(iconButtonElement({ label: 'Save', icon: Mark, pending: true, onClick }))({
      preventDefault,
    });
    expect(onClick).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  test("the consumer's handler runs before the tooltip trigger's, and a prevented event stops it", () => {
    const calls: string[] = [];
    const element = iconButtonElement(
      {
        label: 'Save',
        icon: Mark,
        onClick: (event) => {
          calls.push('consumer');
          event.preventDefault();
        },
      },
      { onClick: () => calls.push('trigger') },
    );
    let prevented = false;
    clickOf(element)({
      get defaultPrevented() {
        return prevented;
      },
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(calls).toEqual(['consumer']);
  });

  test('an empty label warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderToString(<IconButton label=" " icon={Mark} tooltip={false} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/no accessible name/);
    renderToString(<IconButton label="" icon={Mark} aria-labelledby="title" tooltip={false} />);
    renderToString(<IconButton label="Delete" icon={Mark} tooltip={false} />);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

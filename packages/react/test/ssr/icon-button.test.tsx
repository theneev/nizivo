// IconButton (ARCHITECTURE.md §9.5 "split", §10.2): the server shell, the tooltip leaf across the RSC
// boundary, and the markup both paths share. Tooltip behaviour in a browser: test/browser/icon-button.spec.tsx.
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
import { IconButton, iconButtonElement } from '../../src/icon-button/icon-button';
import { IconButtonTooltip } from '../../src/icon-button/icon-button.client';

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
    expect(examples).toHaveLength(4);
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

// CommandMenu and hotkeys in a browser (ARCHITECTURE.md §17 G18; D-dh, D-di): ⌘K opens and closes
// the menu, also from a text field; the trigger names its shortcut; typing filters the rows, case
// and accents ignored; the arrow keys move the active row while focus stays in the field; Enter runs
// the row and closes; Escape clears the field first, then closes and returns focus. The hotkeys
// registry: no shortcut during an IME composition or while typing (unless allowed), the latest
// registration of an id wins, and useHotkeys lists them. D-dt: a group's `limit` leaves the rows past
// it out of the arrow keys' reach, an async source (`filter="none"`, `loading`) shows what the app
// passes, and a polite status counts the rows once the typing stops.
import { useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { registerHotkey, toTinykeys, useHotkeys } from '../../src/hotkeys/index';
import { CommandMenu } from '../../src/unstable/command-menu/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/dialog/dialog.css',
    '../../src/kbd/kbd.css',
    '../../src/unstable/command-menu/command-menu.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 5)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 80));

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

const popup = (): HTMLElement | null => document.querySelector('.nz-command-menu-popup');

/** Waits for the popup to leave (its exit transition), then for focus to return. */
async function closed(): Promise<void> {
  // oxlint-disable-next-line no-await-in-loop -- polled one step at a time on purpose
  for (let i = 0; i < 40 && popup() !== null; i += 1) await settle();
  await settle();
}

const input = (): HTMLInputElement => {
  const el = document.querySelector('[data-slot="command-menu-input"]');
  if (!(el instanceof HTMLInputElement)) throw new Error('no input');
  return el;
};

const rows = (): string[] =>
  [...document.querySelectorAll('.nz-command-menu-item .nz-command-menu-label')].map(
    (el) => el.textContent ?? '',
  );

const active = (): string | undefined =>
  document.querySelector('.nz-command-menu-item[data-highlighted] .nz-command-menu-label')
    ?.textContent ?? undefined;

function Menu({ onCreate }: { onCreate?: () => void }): ReactNode {
  return (
    <>
      <input aria-label="Notes" />
      <CommandMenu.Root>
        <CommandMenu.Trigger>Search</CommandMenu.Trigger>
        <CommandMenu.Popup>
          <CommandMenu.Input />
          <CommandMenu.List>
            <CommandMenu.Group heading="Products">
              <CommandMenu.Item href="#mug">Stoneware mug</CommandMenu.Item>
              <CommandMenu.Item href="#creme">Crème jar</CommandMenu.Item>
            </CommandMenu.Group>
            <CommandMenu.Group heading="Actions">
              <CommandMenu.Item shortcut="mod+n" {...(onCreate && { onAction: onCreate })}>
                Create product
              </CommandMenu.Item>
            </CommandMenu.Group>
          </CommandMenu.List>
          <CommandMenu.Footer />
        </CommandMenu.Popup>
      </CommandMenu.Root>
    </>
  );
}

const trigger = (container: ParentNode): HTMLElement => {
  const el = container.querySelector<HTMLElement>('[data-slot="command-menu-trigger"]');
  if (el === null) throw new Error('no trigger');
  return el;
};

describe('opening', () => {
  test('⌘K opens it with focus in the field, also from a text field; ⌘K again closes it', async () => {
    const container = await mount(<Menu />);
    container.querySelector('input')?.focus();
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await settle();
    expect(popup()).not.toBeNull();
    // the search is a lazy chunk (M72): the first open waits for it, then the field has focus
    await vi.waitFor(() => expect(document.activeElement).toBe(input()));
    expect(document.querySelector('.nz-command-menu-pending')).toBeNull();
    expect(popup()?.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Command menu',
    );
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await closed();
    expect(popup()).toBeNull();
  });

  test('the trigger opens it and names its shortcut', async () => {
    const container = await mount(<Menu />);
    expect(trigger(container).getAttribute('aria-keyshortcuts')).toBe('Meta+K Control+K');
    await userEvent.click(trigger(container));
    await settle();
    expect(popup()).not.toBeNull();
  });
});

describe('searching and choosing', () => {
  test('typing filters, case and accents ignored', async () => {
    const container = await mount(<Menu />);
    await userEvent.click(trigger(container));
    await settle();
    expect(rows()).toEqual(['Stoneware mug', 'Crème jar', 'Create product']);
    await userEvent.keyboard('creme');
    expect(rows()).toEqual(['Crème jar']);
    await userEvent.keyboard('zzz');
    expect(document.querySelector('.nz-command-menu-empty')?.textContent).toBe('No results');
  });

  test('the arrow keys move the active row while focus stays in the field; Enter runs it and closes', async () => {
    const onCreate = vi.fn<() => void>();
    const container = await mount(<Menu onCreate={onCreate} />);
    await userEvent.click(trigger(container));
    await settle();
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toBe('Stoneware mug');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(active()).toBe('Create product');
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute('aria-activedescendant')).toBeTruthy();
    await userEvent.keyboard('{Enter}');
    await closed();
    expect(onCreate).toHaveBeenCalledOnce();
    expect(popup()).toBeNull();
  });

  test('Escape clears the field first, then closes and returns focus to the trigger', async () => {
    const container = await mount(<Menu />);
    await userEvent.click(trigger(container));
    await settle();
    await userEvent.keyboard('mug');
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(popup()).not.toBeNull();
    expect(input().value).toBe('');
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(trigger(container));
  });
});

const status = (): string => document.querySelector('.nz-command-menu-status')?.textContent ?? '';

function Capped(): ReactNode {
  return (
    <CommandMenu.Root>
      <CommandMenu.Trigger>Search</CommandMenu.Trigger>
      <CommandMenu.Popup>
        <CommandMenu.Input />
        <CommandMenu.List>
          <CommandMenu.Group heading="Products" limit={2}>
            <CommandMenu.Item href="#mug">Stoneware mug</CommandMenu.Item>
            <CommandMenu.Item href="#bowl">Stoneware bowl</CommandMenu.Item>
            <CommandMenu.Item href="#plate">Stoneware plate</CommandMenu.Item>
          </CommandMenu.Group>
          <CommandMenu.Group heading="Actions">
            <CommandMenu.Item href="#new">Create product</CommandMenu.Item>
          </CommandMenu.Group>
        </CommandMenu.List>
      </CommandMenu.Popup>
    </CommandMenu.Root>
  );
}

const CATALOGUE = ['Large bowl', 'Mug', 'Plate'];

/** An async source: results arrive 150 ms after the query, from a list the menu never filters. */
function Remote({ onQuery }: { onQuery?: (query: string) => void }): ReactNode {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  return (
    <CommandMenu.Root>
      <CommandMenu.Trigger>Search</CommandMenu.Trigger>
      <CommandMenu.Popup
        filter="none"
        query={query}
        onQueryChange={(next) => {
          setQuery(next);
          onQuery?.(next);
          setLoading(true);
          setResults([]);
          setTimeout(() => {
            // the server's answer: not a text match, so the menu must not filter it
            setResults(next === '' ? [] : CATALOGUE.slice(0, 2));
            setLoading(false);
          }, 150);
        }}
      >
        <CommandMenu.Input />
        <CommandMenu.List loading={loading}>
          {results.map((name) => (
            <CommandMenu.Item key={name} href={`#${name}`}>
              {name}
            </CommandMenu.Item>
          ))}
        </CommandMenu.List>
      </CommandMenu.Popup>
    </CommandMenu.Root>
  );
}

describe('caps, async sources and the count (D-dt)', () => {
  test("a group's limit shows its first matching rows; the arrow keys go from the last to the next group", async () => {
    const container = await mount(<Capped />);
    await userEvent.click(trigger(container));
    await settle();
    await vi.waitFor(() =>
      expect(rows()).toEqual(['Stoneware mug', 'Stoneware bowl', 'Create product']),
    );
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(active()).toBe('Create product');
    // the limit counts matching rows: "bowl" and "plate" match, the first one shows
    await userEvent.keyboard('pl');
    expect(rows()).toEqual(['Stoneware plate']);
    // a group with no matching row shows no heading
    expect(
      [...document.querySelectorAll('.nz-command-menu-group-label')].map((el) => el.textContent),
    ).toEqual(['Products']);
  });

  test('an async source: busy while loading, then exactly the rows the app passes, then the count', async () => {
    const queries: string[] = [];
    const container = await mount(<Remote onQuery={(q) => queries.push(q)} />);
    await userEvent.click(trigger(container));
    await settle();
    await vi.waitFor(() => expect(document.activeElement).toBe(input()));
    await userEvent.keyboard('mu');
    expect(queries).toEqual(['m', 'mu']);
    expect(document.querySelector('.nz-command-menu-loading')?.textContent).toBe('Searching…');
    expect(
      document.querySelector('[data-slot="command-menu-list"]')?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(document.querySelector('.nz-command-menu-empty')).toBeNull();
    await vi.waitFor(() => expect(rows()).toEqual(['Large bowl', 'Mug']));
    expect(
      document.querySelector('[data-slot="command-menu-list"]')?.hasAttribute('aria-busy'),
    ).toBe(false);
    await vi.waitFor(() => expect(status()).toBe('Results: 2'));
    // Escape clears the field through onQueryChange, then closes
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(queries.at(-1)).toBe('');
    expect(input().value).toBe('');
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(popup()).toBeNull();
  });

  test('the count is spoken once the typing stops, "No results" when none show, nothing on open', async () => {
    const container = await mount(<Menu />);
    await userEvent.click(trigger(container));
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(status()).toBe('');
    const live = document.querySelector('.nz-command-menu-status');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    // outside the menu: a live region may not sit in a role="menu"
    expect(live?.closest('[role="menu"]')).toBeNull();
    await userEvent.keyboard('stone');
    expect(status()).toBe('');
    await vi.waitFor(() => expect(status()).toBe('Results: 1'));
    await userEvent.keyboard('zzz');
    await vi.waitFor(() => expect(status()).toBe('No results'));
  });
});

describe('hotkeys', () => {
  test('the shortcut syntax: Kbd’s "mod+shift+k" is tinykeys’ "$mod+Shift+k"', () => {
    expect(toTinykeys('mod+shift+k')).toBe('$mod+Shift+k');
    expect(toTinykeys('alt+up')).toBe('Alt+ArrowUp');
  });

  test('not while typing unless allowed; never during an IME composition', async () => {
    const run = vi.fn<(event: KeyboardEvent) => void>();
    const allowed = vi.fn<(event: KeyboardEvent) => void>();
    const off = [
      registerHotkey({ id: 'a', keys: 'mod+j', description: 'Jump', run }),
      registerHotkey({
        id: 'b',
        keys: 'mod+u',
        description: 'Up',
        allowInInputs: true,
        run: allowed,
      }),
    ];
    await mount(<input aria-label="Notes" />);
    document.querySelector('input')?.focus();
    await userEvent.keyboard('{Meta>}j{/Meta}{Meta>}u{/Meta}');
    expect(run).not.toHaveBeenCalled();
    expect(allowed).toHaveBeenCalledOnce();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'u', metaKey: true, isComposing: true, bubbles: true }),
    );
    expect(allowed).toHaveBeenCalledOnce();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await userEvent.keyboard('{Meta>}j{/Meta}');
    expect(run).toHaveBeenCalledOnce();
    for (const remove of off) remove();
  });

  test('useHotkeys lists them; the last registration of an id wins; removing it lists none', async () => {
    const seen: string[][] = [];
    function List(): ReactNode {
      const list = useHotkeys();
      seen.push(list.map((h) => `${h.id}:${h.keys}`));
      return null;
    }
    await mount(<List />);
    const first = registerHotkey({
      id: 'x',
      keys: 'mod+1',
      description: 'One',
      run: () => undefined,
    });
    const second = registerHotkey({
      id: 'x',
      keys: 'mod+2',
      description: 'Two',
      run: () => undefined,
    });
    await settle();
    expect(seen.at(-1)).toEqual(['x:mod+2']);
    first();
    await settle();
    expect(seen.at(-1)).toEqual(['x:mod+2']);
    second();
    await settle();
    expect(seen.at(-1)).toEqual([]);
  });

  test('a single printable key warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const off = registerHotkey({ id: 'q', keys: 'q', description: 'Quit', run: () => undefined });
    expect(warn).toHaveBeenCalledOnce();
    off();
  });
});

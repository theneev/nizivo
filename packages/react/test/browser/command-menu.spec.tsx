// CommandMenu and hotkeys in a browser (ARCHITECTURE.md §17 G18; D-dh, D-di): ⌘K opens and closes
// the menu, also from a text field; the trigger names its shortcut; typing filters the rows, case
// and accents ignored; the arrow keys move the active row while focus stays in the field; Enter runs
// the row and closes; Escape clears the field first, then closes and returns focus. The hotkeys
// registry: no shortcut during an IME composition or while typing (unless allowed), the latest
// registration of an id wins, and useHotkeys lists them.
import type { ReactNode } from 'react';
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

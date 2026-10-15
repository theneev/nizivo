// O-11 focus-return fallbacks and O-02 (Menu → Dialog) on the react-aria family (ARCHITECTURE.md
// §12.2 Focus return, §12.3 Menu row, §12.5).
import { useEffect, useRef, useState, type JSX } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Dialog } from '../../src/dialog/index';
import { Menu } from '../../src/menu/index';
import { Select } from '../../src/select/index';
import type { DialogRootProps } from '../../src/dialog/index';
import { find, get, mount, settle, until } from './harness';

/** A Menu item that opens a Dialog: the Menu closes first, and the Dialog has no trigger of its own. */
function MenuThenDialog({ menuOpen }: { menuOpen?: boolean } = {}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Menu.Root {...(menuOpen === undefined ? {} : { defaultOpen: menuOpen })}>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Popup>
          <Menu.Item onAction={() => setOpen(true)}>Rename…</Menu.Item>
          <Menu.Item>Archive</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Popup>
          <Dialog.Title>Rename</Dialog.Title>
          <Dialog.Body>
            <input aria-label="Name" />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>
    </>
  );
}

describe('O-02 Menu → Dialog focus return', () => {
  test('pointer: a Dialog opened from a Menu item returns focus to the Menu trigger', async () => {
    await mount(<MenuThenDialog />);
    await userEvent.click(get('menu-trigger'));
    await until(() => expect(find('menu-popup')).not.toBeNull());
    await userEvent.click(get('menu-item'));
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    await until(() => expect(find('menu-popup')).toBeNull());
    await until(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Name'));
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('dialog-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement).toBe(get('menu-trigger'));
  });

  test('keyboard: the same, from Enter on the item', async () => {
    await mount(<MenuThenDialog />);
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(document.activeElement?.textContent).toBe('Rename…'));
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    await until(() => expect(find('menu-popup')).toBeNull());
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('dialog-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement).toBe(get('menu-trigger'));
  });

  test('a Menu open at mount (focus on <body>) still hands the Dialog its trigger: the parent-overlay step', async () => {
    await mount(<MenuThenDialog menuOpen />);
    await until(() => expect(find('menu-popup')).not.toBeNull());
    await until(() => expect(get('menu-popup').contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{ArrowDown}');
    await until(() => expect(document.activeElement?.textContent).toBe('Rename…'));
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    await until(() => expect(find('menu-popup')).toBeNull());
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('dialog-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement).toBe(get('menu-trigger'));
  });
});

/** A Dialog with a `returnFocus`, a "Next" button to send focus to, and a removable trigger. */
function Returning({
  returnFocus,
}: {
  returnFocus: 'ref' | 'function' | 'false' | 'gone';
}): JSX.Element {
  const next = useRef<HTMLButtonElement | null>(null);
  const [showTrigger, setShowTrigger] = useState(true);
  const [showNext, setShowNext] = useState(true);
  const target: DialogRootProps['returnFocus'] =
    returnFocus === 'false'
      ? false
      : returnFocus === 'function'
        ? () => document.getElementById('next')
        : next;
  return (
    <>
      {showNext ? (
        <button type="button" id="next" ref={next}>
          Next
        </button>
      ) : null}
      <Dialog.Root returnFocus={target}>
        {showTrigger ? <Dialog.Trigger>Open</Dialog.Trigger> : null}
        <Dialog.Popup>
          <Dialog.Title>Return</Dialog.Title>
          <Dialog.Body>
            <button
              type="button"
              onClick={() => {
                setShowTrigger(false);
                setShowNext(false);
              }}
            >
              Remove both
            </button>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>
    </>
  );
}

/**
 * Nizivo's own warnings. React Aria also warns, in development, that a Dialog.Root with no
 * Dialog.Trigger (a controlled dialog opened from elsewhere) renders its PressResponder empty.
 */
function nizivoWarnings(warn: { mock: { calls: unknown[][] } }): string[] {
  return warn.mock.calls.map((call) => String(call[0])).filter((text) => text.startsWith('Nizivo'));
}

async function openDialog(): Promise<void> {
  await userEvent.click(get('dialog-trigger'));
  await until(() => expect(find('dialog-popup')?.hasAttribute('data-entering')).toBe(false));
}

async function escape(): Promise<void> {
  await userEvent.keyboard('{Escape}');
  await until(() => expect(find('dialog-popup')).toBeNull());
  await settle(100);
}

async function openThenEscape(): Promise<void> {
  await openDialog();
  await escape();
}

describe('O-11 focus-return fallbacks (§12.2)', () => {
  test('returnFocus as a ref sends focus there instead of the trigger', async () => {
    await mount(<Returning returnFocus="ref" />);
    await openThenEscape();
    expect(document.activeElement?.id).toBe('next');
  });

  test('returnFocus as a function sends focus to the element it returns', async () => {
    await mount(<Returning returnFocus="function" />);
    await openThenEscape();
    expect(document.activeElement?.id).toBe('next');
  });

  test('returnFocus={false} leaves focus alone: not on the trigger, and no warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount(<Returning returnFocus="false" />);
    await openThenEscape();
    expect(document.activeElement).not.toBe(get('dialog-trigger'));
    expect(nizivoWarnings(warn)).toEqual([]);
  });

  test('a returnFocus target that is gone falls back along the chain, then to <body> with a development warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount(<Returning returnFocus="gone" />);
    await openDialog();
    const remove = get('dialog-body').querySelector('button');
    if (remove === null) throw new Error('no button');
    await userEvent.click(remove);
    await until(() => expect(find('dialog-trigger')).toBeNull());
    await escape();
    expect(document.activeElement).toBe(document.body);
    const warnings = nizivoWarnings(warn);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('returnFocus');
  });

  // Review R1-3: <body> as the element that had focus is not a return target.
  test('a controlled Dialog with no trigger, opened with nothing focused, warns once as it closes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const control: { open?: (open: boolean) => void } = {};
    function Controlled(): JSX.Element {
      const [open, set] = useState(false);
      useEffect(() => {
        control.open = set;
      }, []);
      return (
        <Dialog.Root open={open} onOpenChange={set}>
          <Dialog.Popup>
            <Dialog.Title>Saved</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
      );
    }
    await mount(<Controlled />);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    expect(document.activeElement).toBe(document.body);
    control.open?.(true);
    await until(() => expect(find('dialog-popup')?.hasAttribute('data-entering')).toBe(false));
    await escape();
    expect(document.activeElement).toBe(document.body);
    expect(nizivoWarnings(warn)).toHaveLength(1);
  });

  // React Aria renders a Select's content once more in a hidden pass that builds its collection;
  // that copy has no popup and must not run the chain (the Next dev fixture saw the warning).
  test('a Select picked by pointer, in Strict Mode, then unmounted, warns nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = await mount(
      <Select.Root defaultValue="30d" aria-label="Period">
        <Select.Trigger />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
        </Select.Popup>
      </Select.Root>,
      { strict: true },
    );
    await userEvent.click(get('select-trigger'));
    await until(() => expect(find('select-popup')).not.toBeNull());
    const [first] = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    if (first === undefined) throw new Error('no items');
    await userEvent.click(first);
    await until(() => expect(find('select-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement).toBe(get('select-trigger'));
    container.remove();
    await settle(100);
    expect(nizivoWarnings(warn)).toEqual([]);
  });

  test('the default chain warns nothing when the trigger takes focus back', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount(<MenuThenDialog />);
    await userEvent.click(get('menu-trigger'));
    await until(() => expect(find('menu-popup')).not.toBeNull());
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('menu-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement).toBe(get('menu-trigger'));
    expect(nizivoWarnings(warn)).toEqual([]);
  });
});

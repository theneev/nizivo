// Overlays inside overlays on the react-aria family's OverlayEngine (ARCHITECTURE.md §12.1 L2, §12.2,
// §12.5 stage v0.1): O-01, O-03, O-04, O-10, O-11 and O-22 from gap report C §1.10.
import { useState, type JSX } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Dialog } from '../../src/dialog/index';
import { Menu } from '../../src/menu/index';
import { Select } from '../../src/select/index';
import { Tooltip } from '../../src/tooltip/index';
import {
  expectContract,
  find,
  get,
  locked,
  mount,
  pageStyles,
  parkPointer,
  paintsOnTop,
  settle,
  until,
} from './harness';

function all(slot: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)];
}

async function escape(): Promise<void> {
  await userEvent.keyboard('{Escape}');
}

function PeriodSelect(): JSX.Element {
  return (
    <Select.Root aria-label="Period" defaultValue="30d">
      <Select.Trigger />
      <Select.Popup>
        <Select.Item value="7d">Last 7 days</Select.Item>
        <Select.Item value="30d">Last 30 days</Select.Item>
        <Select.Item value="90d">Last 90 days</Select.Item>
      </Select.Popup>
    </Select.Root>
  );
}

/** O-11: a Dialog whose trigger can be removed while it is open. */
function RemovableTrigger(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [showTrigger, setShowTrigger] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShowTrigger(false)}>
        Before
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        {showTrigger ? <Dialog.Trigger>Open</Dialog.Trigger> : null}
        <Dialog.Popup>
          <Dialog.Title>Removed trigger</Dialog.Title>
          <Dialog.Body>
            <button type="button" onClick={() => setShowTrigger(false)}>
              Remove the trigger
            </button>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>
    </>
  );
}

describe('nested overlays (§12.5 v0.1)', () => {
  // O-01 leaves the real pointer where it pressed the Select trigger, and O-03's tooltip trigger
  // passes under that spot while its dialog enters: Firefox then hovers it, with no pointermove,
  // during the entry and again after the first Escape. A hover start on a trigger that keeps its
  // focus flag can reopen the tooltip, and the second Escape then closes it instead of the dialog
  // (NIZ-126). Every case starts with the pointer parked.
  beforeEach(parkPointer);

  test('O-01 Select inside Dialog: the listbox portals into the dialog, paints on top, and Esc closes only the listbox', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Filters</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Filters</Dialog.Title>
          <Dialog.Body>
            <PeriodSelect />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(find('dialog-popup')?.hasAttribute('data-entering')).toBe(false));
    const trigger = get('select-trigger');
    await userEvent.click(trigger);
    await until(() => expect(find('select-popup')).not.toBeNull());
    const popup = get('select-popup');
    expect(popup.closest('[data-slot="dialog-positioner"]')).toBe(get('dialog-positioner'));
    await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
    const option = [...popup.querySelectorAll('[role="option"]')].at(-1);
    if (option === undefined) throw new Error('no option');
    expect(paintsOnTop(option)).toBe(true);
    expectContract();

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('select-popup')).toBeNull());
    expect(get('select-value').textContent).toBe('Last 90 days');
    await until(() => expect(document.activeElement).toBe(trigger));

    await userEvent.keyboard('{ArrowDown}');
    await until(() => expect(find('select-popup')).not.toBeNull());
    await escape();
    await until(() => expect(find('select-popup')).toBeNull());
    expect(find('dialog-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));
  });

  test('Tab out of a listbox inside a Dialog closes it and moves on inside the dialog (§12.2)', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Filters</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Filters</Dialog.Title>
          <Dialog.Body>
            <PeriodSelect />
            <button type="button">Apply</button>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(document.activeElement).toBe(get('select-trigger')));
    await userEvent.keyboard('{ArrowDown}');
    await until(() => expect(find('select-popup')).not.toBeNull());
    await userEvent.keyboard('{Tab}');
    await until(() => expect(find('select-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement?.textContent).toBe('Apply');
    expect(find('dialog-popup')).not.toBeNull();
  });

  test('O-03 Tooltip inside Dialog: paints above it, its description resolves, and Esc closes the tooltip first', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Share</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Share</Dialog.Title>
          <Dialog.Body>
            <Tooltip.Root delay={0}>
              <Tooltip.Trigger>Copy link</Tooltip.Trigger>
              <Tooltip.Popup>Copies the store link</Tooltip.Popup>
            </Tooltip.Root>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    // Opened from the keyboard, the dialog focuses the first tabbable element in its body (§12.2),
    // the tooltip trigger, and a keyboard focus shows the tooltip.
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('dialog-popup')?.hasAttribute('data-entering')).toBe(false));
    const trigger = get('tooltip-trigger');
    await until(() => expect(document.activeElement).toBe(trigger));
    await until(() => expect(find('tooltip-popup')).not.toBeNull());
    const tip = get('tooltip-popup');
    expect(tip.closest('[data-slot="dialog-positioner"]')).toBe(get('dialog-positioner'));
    expect(document.getElementById(trigger.getAttribute('aria-describedby') ?? '')).toBe(tip);
    await until(() => expect(paintsOnTop(tip)).toBe(true));

    await escape();
    await until(() => expect(find('tooltip-popup')).toBeNull());
    expect(find('dialog-popup')).not.toBeNull();
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
  });

  test('O-04 Dialog on Dialog: one backdrop, inner on top, Esc closes inner then outer, focus walks back, styles restored', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Edit product</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Edit product</Dialog.Title>
          <Dialog.Body>
            <Dialog.Root>
              <Dialog.Trigger>Delete</Dialog.Trigger>
              <Dialog.Popup role="alertdialog" size="sm">
                <Dialog.Title>Delete product?</Dialog.Title>
                <Dialog.Description>This can't be undone.</Dialog.Description>
                <Dialog.Footer>
                  <Dialog.Close>Cancel</Dialog.Close>
                </Dialog.Footer>
              </Dialog.Popup>
            </Dialog.Root>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    const before = pageStyles();
    const outerTrigger = get('dialog-trigger');
    await userEvent.click(outerTrigger);
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    const innerTrigger = all('dialog-trigger')[1];
    if (innerTrigger === undefined) throw new Error('no inner trigger');
    await userEvent.click(innerTrigger);
    await until(() => expect(all('dialog-popup')).toHaveLength(2));
    const [outer, inner] = all('dialog-popup');
    if (outer === undefined || inner === undefined) throw new Error('no popups');
    await until(() => expect(inner.hasAttribute('data-entering')).toBe(false));
    expect(all('dialog-backdrop')).toHaveLength(1);
    expect(outer.hasAttribute('data-nested-open')).toBe(true);
    expect(paintsOnTop(inner)).toBe(true);
    // An alertdialog is described by its description (§12.3).
    const content = get('dialog-content', inner);
    expect(content.getAttribute('role')).toBe('alertdialog');
    expect(content.getAttribute('aria-describedby')).toBe(get('dialog-description', inner).id);
    expect(locked()).toBe(true);
    expectContract();

    // An alertdialog never closes on an outside press.
    await userEvent.click(get('dialog-backdrop'), { force: true, position: { x: 4, y: 4 } });
    await settle(100);
    expect(all('dialog-popup')).toHaveLength(2);

    await escape();
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    await until(() => expect(document.activeElement).toBe(innerTrigger));
    expect(outer.hasAttribute('data-nested-open')).toBe(false);
    expect(locked()).toBe(true);
    await escape();
    await until(() => expect(all('dialog-popup')).toHaveLength(0));
    await until(() => expect(document.activeElement).toBe(outerTrigger));
    await settle();
    expect(locked()).toBe(false);
    expect(pageStyles()).toBe(before);
  });

  test('O-10 one scroll lock, counted: closing a Select inside a Dialog keeps the page locked', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Filters</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Filters</Dialog.Title>
          <Dialog.Body>
            <PeriodSelect />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
      { strict: true },
    );
    const before = pageStyles();
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    for (let cycle = 0; cycle < 5; cycle += 1) {
      // Sequential on purpose: each cycle opens and closes before the next.
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(get('select-trigger'));
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find('select-popup')).not.toBeNull());
      expect(locked()).toBe(true);
      // oxlint-disable-next-line no-await-in-loop
      await escape();
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find('select-popup')).toBeNull());
      expect(locked()).toBe(true);
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(document.activeElement).toBe(get('select-trigger')));
    }
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
    await settle();
    expect(locked()).toBe(false);
    expect(pageStyles()).toBe(before);
  });

  test('O-11 focus return when the trigger is gone: focus lands on a connected element, never a detached one', async () => {
    await mount(<RemovableTrigger />);
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(find('dialog-popup')?.hasAttribute('data-entering')).toBe(false));
    const remove = [...get('dialog-body').querySelectorAll('button')][0];
    if (remove === undefined) throw new Error('no button');
    await userEvent.click(remove);
    await until(() => expect(find('dialog-trigger')).toBeNull());
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement?.isConnected).toBe(true);
  });

  test('O-22 Esc closes exactly one layer per press: Tooltip, Menu, Dialog, Dialog', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Outer</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Outer</Dialog.Title>
          <Dialog.Body>
            <Dialog.Root>
              <Dialog.Trigger>Inner</Dialog.Trigger>
              <Dialog.Popup>
                <Dialog.Title>Inner</Dialog.Title>
                <Dialog.Body>
                  <Menu.Root>
                    <Menu.Trigger>Actions</Menu.Trigger>
                    <Menu.Popup>
                      <Menu.Item>Duplicate</Menu.Item>
                      <Menu.Item>Archive</Menu.Item>
                    </Menu.Popup>
                  </Menu.Root>
                  <Tooltip.Root delay={0}>
                    <Tooltip.Trigger>Help</Tooltip.Trigger>
                    <Tooltip.Popup>What these actions do</Tooltip.Popup>
                  </Tooltip.Root>
                </Dialog.Body>
              </Dialog.Popup>
            </Dialog.Root>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    const inner = all('dialog-trigger')[1];
    if (inner === undefined) throw new Error('no inner trigger');
    await userEvent.click(inner);
    await until(() => expect(all('dialog-popup')).toHaveLength(2));
    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));

    // Layer 3: the Menu, opened from the keyboard.
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).not.toBeNull());
    await escape();
    await until(() => expect(find('menu-popup')).toBeNull());
    expect(all('dialog-popup')).toHaveLength(2);
    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));

    // Layer 4: the Tooltip on the next control.
    await userEvent.keyboard('{Tab}');
    await until(() => expect(find('tooltip-popup')).not.toBeNull());
    await escape();
    await until(() => expect(find('tooltip-popup')).toBeNull());
    expect(all('dialog-popup')).toHaveLength(2);

    await escape();
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    // Focus walks back to the inner dialog's trigger, inside the outer dialog.
    await until(() => expect(document.activeElement).toBe(inner));
    await escape();
    await until(() => expect(all('dialog-popup')).toHaveLength(0));
  });

  test('O-12 an outside press closes only the topmost: a Select, a Menu and a Dialog opened inside a Dialog', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Filters</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Filters</Dialog.Title>
          <Dialog.Body>
            <PeriodSelect />
            <Menu.Root>
              <Menu.Trigger>Actions</Menu.Trigger>
              <Menu.Popup>
                <Menu.Item>Duplicate</Menu.Item>
              </Menu.Popup>
            </Menu.Root>
            <Dialog.Root>
              <Dialog.Trigger>Rename</Dialog.Trigger>
              <Dialog.Popup size="sm">
                <Dialog.Title>Rename</Dialog.Title>
              </Dialog.Popup>
            </Dialog.Root>
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    const outer = get('dialog-title');
    for (const [trigger, popup] of [
      [get('select-trigger'), 'select-popup'],
      [get('menu-trigger'), 'menu-popup'],
    ] as const) {
      // Sequential on purpose: each opens and closes before the next.
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(trigger);
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find(popup)?.hasAttribute('data-entering')).toBe(false));
      // A press on the dialog's title, outside the popup: the popup's underlay takes it, inside the
      // dialog's top-layer nested container, where React Aria does not look (§12.2, D-bn).
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(outer, { force: true });
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find(popup)).toBeNull());
      expect(all('dialog-popup')).toHaveLength(1);
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(document.activeElement).toBe(trigger));
    }
    const rename = all('dialog-trigger')[1];
    if (rename === undefined) throw new Error('no inner trigger');
    await userEvent.click(rename);
    await until(() => expect(all('dialog-popup')).toHaveLength(2));
    await until(() => expect(all('dialog-popup')[1]?.hasAttribute('data-entering')).toBe(false));
    // The inner dialog's positioner covers the outer one: a press in its corner is outside it.
    await userEvent.click(all('dialog-positioner')[1] ?? outer, {
      force: true,
      position: { x: 4, y: 4 },
    });
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    await until(() => expect(document.activeElement).toBe(rename));
    await escape();
    await until(() => expect(all('dialog-popup')).toHaveLength(0));
  });
});

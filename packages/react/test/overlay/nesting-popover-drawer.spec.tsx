// Popover and Drawer nested with the family's other overlays on the react-aria OverlayEngine
// (ARCHITECTURE.md §12.1 L2, §12.2, §12.5): O-05 (Popover inside Drawer) and the week 13 cases that
// extend O-01, O-03, O-04, O-10, O-12 and O-22 to the two new overlays.
import type { JSX } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Dialog } from '../../src/dialog/index';
import { Drawer } from '../../src/drawer/index';
import { Menu } from '../../src/menu/index';
import { Popover } from '../../src/popover/index';
import { Select } from '../../src/select/index';
import { Tooltip } from '../../src/tooltip/index';
import {
  expectContract,
  find,
  get,
  locked,
  mount,
  pageStyles,
  paintsOnTop,
  parkPointer,
  settle,
  until,
} from './harness';

function all(slot: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)];
}

async function escape(): Promise<void> {
  await userEvent.keyboard('{Escape}');
}

/** Waits until `slot` is open and its entry (start state and transition) has finished. */
async function settled(slot: string, index = 0): Promise<HTMLElement> {
  await until(() => expect(all(slot).length).toBeGreaterThan(index));
  const element = all(slot)[index];
  if (element === undefined) throw new Error(`no ${slot}`);
  await until(() => expect(element.hasAttribute('data-entering')).toBe(false));
  await until(() => expect(element.getAnimations()).toEqual([]), 3000);
  return element;
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

function FilterPopover({ children }: { children?: JSX.Element }): JSX.Element {
  return (
    <Popover.Root>
      <Popover.Trigger>Filters</Popover.Trigger>
      <Popover.Popup>
        <Popover.Title>Filters</Popover.Title>
        {children ?? <button type="button">Apply</button>}
      </Popover.Popup>
    </Popover.Root>
  );
}

function OrderDrawer({ children }: { children: JSX.Element }): JSX.Element {
  return (
    <Drawer.Root>
      <Drawer.Trigger>View order</Drawer.Trigger>
      <Drawer.Popup>
        <Drawer.Header>
          <Drawer.Title>Order #1042</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body>{children}</Drawer.Body>
      </Drawer.Popup>
    </Drawer.Root>
  );
}

/** The box-less container a Popover's nested overlays portal into: the element right after it. */
function nestedContainer(popup: HTMLElement): Element | null {
  return popup.nextElementSibling;
}

describe('Popover and Drawer nested with the family (§12.5)', () => {
  // As in nesting.spec.tsx: a pointer left over a trigger the next case mounts can be taken for a
  // hover start in WebKit and Firefox (NIZ-126).
  beforeEach(parkPointer);

  test('O-05 Popover inside Drawer: portals into the drawer, paints on top, Esc and an outside press close only the popover, the lock holds', async () => {
    await mount(
      <OrderDrawer>
        <FilterPopover />
      </OrderDrawer>,
    );
    const before = pageStyles();
    await userEvent.click(get('drawer-trigger'));
    await settled('drawer-popup');
    const trigger = get('popover-trigger');
    await userEvent.click(trigger);
    const popup = await settled('popover-popup');
    expect(popup.closest('[data-slot="drawer-positioner"]')).toBe(get('drawer-positioner'));
    expect(paintsOnTop(popup)).toBe(true);
    expect(locked()).toBe(true);
    expectContract();

    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
    expect(find('drawer-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));
    expect(locked()).toBe(true);

    // O-12: a press on the drawer outside the popover closes the popover, not the drawer.
    await userEvent.click(trigger);
    await settled('popover-popup');
    await userEvent.click(get('drawer-title'), { force: true });
    await until(() => expect(find('popover-popup')).toBeNull());
    expect(find('drawer-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));

    await escape();
    await until(() => expect(find('drawer-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('drawer-trigger')));
    await settle();
    expect(locked()).toBe(false);
    expect(pageStyles()).toBe(before);
  });

  test('Popover inside Dialog: portals into the dialog positioner and Esc closes the popover first', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Edit product</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Edit product</Dialog.Title>
          <Dialog.Body>
            <FilterPopover />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.click(get('dialog-trigger'));
    await settled('dialog-popup');
    const trigger = get('popover-trigger');
    await userEvent.click(trigger);
    const popup = await settled('popover-popup');
    expect(popup.closest('[data-slot="dialog-positioner"]')).toBe(get('dialog-positioner'));
    expect(paintsOnTop(popup)).toBe(true);
    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
    expect(find('dialog-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
  });

  test('Select inside Popover: the listbox portals next to the popover, paints on top, and Esc closes only the listbox', async () => {
    await mount(
      <FilterPopover>
        <PeriodSelect />
      </FilterPopover>,
    );
    const before = pageStyles();
    await userEvent.click(get('popover-trigger'));
    const popover = await settled('popover-popup');
    const trigger = get('select-trigger');
    await userEvent.click(trigger);
    const listbox = await settled('select-popup');
    expect(nestedContainer(popover)?.contains(listbox)).toBe(true);
    const option = [...listbox.querySelectorAll('[role="option"]')].at(-1);
    if (option === undefined) throw new Error('no option');
    expect(paintsOnTop(option)).toBe(true);
    expectContract();

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('select-popup')).toBeNull());
    expect(get('select-value').textContent).toBe('Last 90 days');
    expect(find('popover-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));

    await userEvent.keyboard('{ArrowDown}');
    await settled('select-popup');
    await escape();
    await until(() => expect(find('select-popup')).toBeNull());
    expect(find('popover-popup')).not.toBeNull();
    expect(locked()).toBe(true);
    await until(() => expect(document.activeElement).toBe(trigger));
    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('popover-trigger')));
    await settle();
    expect(locked()).toBe(false);
    expect(pageStyles()).toBe(before);
  });

  test('Menu inside Popover: Esc closes the menu, then the popover; focus walks back', async () => {
    await mount(
      <FilterPopover>
        <Menu.Root>
          <Menu.Trigger>Actions</Menu.Trigger>
          <Menu.Popup>
            <Menu.Item>Duplicate</Menu.Item>
            <Menu.Item>Archive</Menu.Item>
          </Menu.Popup>
        </Menu.Root>
      </FilterPopover>,
    );
    await userEvent.click(get('popover-trigger'));
    const popover = await settled('popover-popup');
    const trigger = get('menu-trigger');
    await until(() => expect(document.activeElement).toBe(trigger));
    await userEvent.keyboard('{Enter}');
    const menu = await settled('menu-popup');
    expect(nestedContainer(popover)?.contains(menu)).toBe(true);
    expect(paintsOnTop(menu)).toBe(true);
    await escape();
    await until(() => expect(find('menu-popup')).toBeNull());
    expect(find('popover-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));
    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('popover-trigger')));
  });

  test('Tooltip inside Popover: shown on keyboard focus, paints above, stays hoverable, Esc closes it first', async () => {
    await mount(
      <FilterPopover>
        <Tooltip.Root delay={0}>
          <Tooltip.Trigger>Help</Tooltip.Trigger>
          <Tooltip.Popup>What these filters do</Tooltip.Popup>
        </Tooltip.Root>
      </FilterPopover>,
    );
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Enter}');
    const popover = await settled('popover-popup');
    const trigger = get('tooltip-trigger');
    await until(() => expect(document.activeElement).toBe(trigger));
    await until(() => expect(find('tooltip-popup')).not.toBeNull());
    const tip = get('tooltip-popup');
    expect(nestedContainer(popover)?.contains(tip)).toBe(true);
    expect(document.getElementById(trigger.getAttribute('aria-describedby') ?? '')).toBe(tip);
    // The nested container carries the engine's top-layer exemption, so the tooltip is not inert.
    expect(tip.closest('[inert]')).toBeNull();
    await until(() => expect(paintsOnTop(tip)).toBe(true));
    await escape();
    await until(() => expect(find('tooltip-popup')).toBeNull());
    expect(find('popover-popup')).not.toBeNull();
    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
  });

  test('Dialog opened from a Popover: on top with its own scrim; Esc closes the dialog, then the popover', async () => {
    await mount(
      <FilterPopover>
        <Dialog.Root>
          <Dialog.Trigger>Save as view</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Save as view</Dialog.Title>
            <Dialog.Body>
              <input aria-label="View name" />
            </Dialog.Body>
          </Dialog.Popup>
        </Dialog.Root>
      </FilterPopover>,
    );
    await userEvent.click(get('popover-trigger'));
    await settled('popover-popup');
    const trigger = get('dialog-trigger');
    await userEvent.click(trigger);
    const dialog = await settled('dialog-popup');
    // A Popover is not a modal leaf: the dialog opened from it is a root modal with its scrim.
    expect(all('dialog-backdrop')).toHaveLength(1);
    expect(paintsOnTop(dialog)).toBe(true);
    await until(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('View name'));
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
    expect(find('popover-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(trigger));
    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
  });

  test('Dialog on Drawer and Drawer on Dialog: one scrim, the parent marked data-nested-open, styles restored', async () => {
    await mount(
      <>
        <OrderDrawer>
          <Dialog.Root>
            <Dialog.Trigger>Refund</Dialog.Trigger>
            <Dialog.Popup role="alertdialog" size="sm">
              <Dialog.Title>Refund order?</Dialog.Title>
              <Dialog.Footer>
                <Dialog.Close>Cancel</Dialog.Close>
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Root>
        </OrderDrawer>
        <Dialog.Root>
          <Dialog.Trigger>Settings</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Settings</Dialog.Title>
            <Dialog.Body>
              <Drawer.Root>
                <Drawer.Trigger>Advanced</Drawer.Trigger>
                <Drawer.Popup>
                  <Drawer.Title>Advanced</Drawer.Title>
                </Drawer.Popup>
              </Drawer.Root>
            </Dialog.Body>
          </Dialog.Popup>
        </Dialog.Root>
      </>,
    );
    const before = pageStyles();

    const drawerTrigger = get('drawer-trigger');
    await userEvent.click(drawerTrigger);
    const drawer = await settled('drawer-popup');
    const refund = get('dialog-trigger', drawer);
    await userEvent.click(refund);
    await settled('dialog-popup');
    expect(all('drawer-backdrop').length + all('dialog-backdrop').length).toBe(1);
    expect(drawer.hasAttribute('data-nested-open')).toBe(true);
    await until(() => expect(document.activeElement?.textContent).toBe('Cancel'));
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(refund));
    expect(drawer.hasAttribute('data-nested-open')).toBe(false);
    expect(locked()).toBe(true);
    await escape();
    await until(() => expect(find('drawer-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(drawerTrigger));

    const settings = all('dialog-trigger').at(-1);
    if (settings === undefined) throw new Error('no settings trigger');
    await userEvent.click(settings);
    const dialog = await settled('dialog-popup');
    await userEvent.click(get('drawer-trigger', dialog));
    await settled('drawer-popup');
    expect(all('drawer-backdrop').length + all('dialog-backdrop').length).toBe(1);
    expect(dialog.hasAttribute('data-nested-open')).toBe(true);
    await escape();
    await until(() => expect(find('drawer-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('drawer-trigger', dialog)));
    expect(dialog.hasAttribute('data-nested-open')).toBe(false);
    await escape();
    await until(() => expect(find('dialog-popup')).toBeNull());
    await settle();
    expect(locked()).toBe(false);
    expect(pageStyles()).toBe(before);
  });

  test('O-22 Esc closes exactly one layer per press: Menu, Popover, Drawer', async () => {
    await mount(
      <OrderDrawer>
        <FilterPopover>
          <Menu.Root>
            <Menu.Trigger>Actions</Menu.Trigger>
            <Menu.Popup>
              <Menu.Item>Duplicate</Menu.Item>
            </Menu.Popup>
          </Menu.Root>
        </FilterPopover>
      </OrderDrawer>,
    );
    await userEvent.click(get('drawer-trigger'));
    await settled('drawer-popup');
    await userEvent.click(get('popover-trigger'));
    await settled('popover-popup');
    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));
    await userEvent.keyboard('{Enter}');
    await settled('menu-popup');

    await escape();
    await until(() => expect(find('menu-popup')).toBeNull());
    expect(find('popover-popup')).not.toBeNull();
    expect(find('drawer-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));
    await escape();
    await until(() => expect(find('popover-popup')).toBeNull());
    expect(find('drawer-popup')).not.toBeNull();
    await until(() => expect(document.activeElement).toBe(get('popover-trigger')));
    await escape();
    await until(() => expect(find('drawer-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('drawer-trigger')));
  });

  test('O-10 one scroll lock, counted: Popover and Select cycles inside a Drawer under Strict Mode', async () => {
    await mount(
      <OrderDrawer>
        <FilterPopover>
          <PeriodSelect />
        </FilterPopover>
      </OrderDrawer>,
      { strict: true },
    );
    const before = pageStyles();
    await userEvent.click(get('drawer-trigger'));
    await settled('drawer-popup');
    for (let cycle = 0; cycle < 3; cycle += 1) {
      // Sequential on purpose: each cycle opens and closes before the next.
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(get('popover-trigger'));
      // oxlint-disable-next-line no-await-in-loop
      await settled('popover-popup');
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(get('select-trigger'));
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find('select-popup')).not.toBeNull());
      expect(locked()).toBe(true);
      // oxlint-disable-next-line no-await-in-loop
      await escape();
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find('select-popup')).toBeNull());
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(document.activeElement).toBe(get('select-trigger')));
      // oxlint-disable-next-line no-await-in-loop
      await escape();
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find('popover-popup')).toBeNull());
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(document.activeElement).toBe(get('popover-trigger')));
      expect(locked()).toBe(true);
    }
    await escape();
    await until(() => expect(find('drawer-popup')).toBeNull());
    await settle();
    expect(locked()).toBe(false);
    expect(pageStyles()).toBe(before);
  });

  test('O-12 outside press closes only the topmost: a Select, a Menu and a Popover inside a Dialog, then the Dialog', async () => {
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
            <FilterPopover />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.click(get('dialog-trigger'));
    await settled('dialog-popup');
    for (const [trigger, popup] of [
      ['select-trigger', 'select-popup'],
      ['menu-trigger', 'menu-popup'],
      ['popover-trigger', 'popover-popup'],
    ] as const) {
      // Sequential on purpose: each opens and closes before the next.
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(get(trigger));
      // oxlint-disable-next-line no-await-in-loop
      await settled(popup);
      // A press on the dialog's title, outside the popup (the popup's underlay takes it).
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.click(get('dialog-title'), { force: true });
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(find(popup)).toBeNull());
      expect(find('dialog-popup')).not.toBeNull();
      // oxlint-disable-next-line no-await-in-loop
      await settle(100);
    }
    await userEvent.click(get('dialog-backdrop'), { force: true, position: { x: 4, y: 4 } });
    await until(() => expect(find('dialog-popup')).toBeNull());
  });

  test('O-12 a press inside Nizivo top layer (the toast region) dismisses nothing, nested or not', async () => {
    await mount(
      <OrderDrawer>
        <FilterPopover />
      </OrderDrawer>,
    );
    const region = document.createElement('section');
    region.dataset['nzTopLayer'] = '';
    region.setAttribute('data-react-aria-top-layer', '');
    region.style.cssText =
      'position: fixed; inset-block-end: 0; inset-inline-start: 0; inline-size: 40px; block-size: 40px; z-index: 2000;';
    document.body.append(region);
    await userEvent.click(get('drawer-trigger'));
    await settled('drawer-popup');
    await userEvent.click(get('popover-trigger'));
    await settled('popover-popup');
    await userEvent.click(region, { force: true });
    await settle(300);
    expect(find('popover-popup')).not.toBeNull();
    expect(find('drawer-popup')).not.toBeNull();
    region.remove();
  });
});

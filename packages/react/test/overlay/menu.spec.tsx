// Menu against the react-aria family's overlay conformance (ARCHITECTURE.md §9.3 rule 3, §12.3 Menu
// row), plus the APG menu button script: arrows, Home/End, typeahead, disabled items, links, and
// checkbox and radio items.
import { useState, type JSX } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import { IconButton } from '../../src/icon-button/index';
import { Menu } from '../../src/menu/index';
import { describeOverlay } from './conformance';
import { expectContract, find, get, mount, paintsOnTop, settle, until } from './harness';

/** Role and IDREF wiring of an open Menu (APG menu button). */
function menuAria(trigger: HTMLElement, popup: HTMLElement): void {
  const list = get('menu-list', popup);
  expect(list.getAttribute('role')).toBe('menu');
  expect(trigger.getAttribute('aria-haspopup')).toMatch(/^(true|menu)$/);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe(list.id);
  expect(list.getAttribute('aria-labelledby')).toBe(trigger.id);
  const items = [...popup.querySelectorAll('[role="menuitem"]')];
  expect(items.map((item) => item.getAttribute('data-slot'))).toEqual([
    'menu-item',
    'menu-item',
    'menu-item',
  ]);
  // The shortcut is announced once, through aria-keyshortcuts; the Kbd text is hidden.
  expect(items[0]?.getAttribute('aria-keyshortcuts')).toBe('Meta+E Control+E');
  expect(items[0]?.querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true');
  const group = get('menu-group', popup);
  expect(group.getAttribute('role')).toBe('group');
  expect(group.getAttribute('aria-labelledby')).toBe(get('menu-group-label', popup).id);
  expect(get('menu-separator', popup).getAttribute('role')).toBe('separator');
}

describeOverlay({
  name: 'Menu',
  app: ({ defaultOpen, container } = {}) => (
    <Menu.Root {...(defaultOpen === undefined ? {} : { defaultOpen })}>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Popup {...(container === undefined ? {} : { container })}>
        <Menu.Group>
          <Menu.GroupLabel>Product</Menu.GroupLabel>
          <Menu.Item shortcut="mod+e">Edit product</Menu.Item>
          <Menu.Item shortcut="mod+d">Duplicate product</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item tone="critical">Delete product</Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  ),
  trigger: 'menu-trigger',
  popup: 'menu-popup',
  pointer: 'press',
  keys: ['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'],
  focus: 'inside',
  outsidePress: true,
  scrollLock: true,
  scales: true,
  aria: menuAria,
});

/** The check glyph wrapper of a checkbox or radio item (a class only: every item kind shares it). */
function indicator(item: HTMLElement): HTMLElement {
  const element = item.querySelector<HTMLElement>('.nz-menu-item-indicator');
  if (element === null) throw new Error('no indicator');
  return element;
}

function highlighted(): string | undefined {
  return find('menu-popup')?.querySelector('[data-highlighted]')?.textContent ?? undefined;
}

async function openByKeyboard(key = '{Enter}'): Promise<HTMLElement> {
  await userEvent.keyboard('{Tab}');
  await userEvent.keyboard(key);
  await until(() => expect(find('menu-popup')).not.toBeNull());
  return get('menu-popup');
}

const isChromium = server.browser === 'chromium';

describe('Menu behaviour', () => {
  test('the pointer never draws the keyboard ring, though the engine moves DOM focus to the hovered row', async () => {
    await mount(
      <Menu.Root>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Popup>
          <Menu.Item>Edit</Menu.Item>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.CheckboxItem defaultChecked>Status</Menu.CheckboxItem>
        </Menu.Popup>
      </Menu.Root>,
    );
    await userEvent.click(get('menu-trigger'));
    await until(() => expect(find('menu-popup')).not.toBeNull());
    const [edit, duplicate] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]'),
    ];
    if (edit === undefined || duplicate === undefined) throw new Error('no items');
    await userEvent.hover(duplicate);
    await until(() => expect(duplicate.hasAttribute('data-highlighted')).toBe(true));
    expect(document.activeElement).toBe(duplicate);
    expect(duplicate.hasAttribute('data-focus-visible')).toBe(false);
    expect(getComputedStyle(duplicate).outlineStyle).toBe('none');
    // A hovered checked row answers the pointer: the hover fill replaces the brand-subtle fill.
    const status = get('menu-checkbox-item');
    const resting = getComputedStyle(status).backgroundColor;
    await userEvent.hover(status);
    await until(() => expect(status.hasAttribute('data-highlighted')).toBe(true));
    expect(getComputedStyle(status).backgroundColor).not.toBe(resting);
    // A mixed menu reserves the check column on plain rows, so the shortcut column lines up.
    expect(getComputedStyle(edit).paddingInlineEnd).not.toBe(
      getComputedStyle(status).paddingInlineEnd,
    );
    // The keyboard brings the ring back.
    await userEvent.keyboard('{ArrowUp}');
    await until(() => expect(duplicate.hasAttribute('data-focus-visible')).toBe(true));
    expect(getComputedStyle(duplicate).outlineStyle).toBe('solid');
  });

  test.runIf(isChromium)(
    'forced colours: a focused checked item keeps a system-colour ring and glyph; a disabled item is GrayText',
    async () => {
      const session = cdp();
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'forced-colors', value: 'active' }],
      });
      try {
        await mount(
          <Menu.Root>
            <Menu.Trigger>View</Menu.Trigger>
            <Menu.Popup>
              <Menu.CheckboxItem defaultChecked>Status</Menu.CheckboxItem>
              <Menu.Item>Edit</Menu.Item>
              <Menu.Item disabled>Print</Menu.Item>
            </Menu.Popup>
          </Menu.Root>,
        );
        await openByKeyboard();
        const status = get('menu-checkbox-item');
        await until(() => expect(status.hasAttribute('data-focus-visible')).toBe(true));
        const item = getComputedStyle(status);
        expect(item.outlineStyle).toBe('solid');
        // HighlightText on the Highlight fill, not the focus token
        expect(item.outlineColor).toBe(item.color);
        expect(getComputedStyle(indicator(status)).color).toBe(item.color);
        const [edit, print] = [
          ...document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]'),
        ];
        if (edit === undefined || print === undefined) throw new Error('no items');
        expect(getComputedStyle(print).color).not.toBe(getComputedStyle(edit).color);
      } finally {
        await session.send('Emulation.setEmulatedMedia', { features: [] });
      }
    },
  );

  test('APG keys: the first item takes focus, arrows wrap, Home/End jump, typeahead finds, disabled items are skipped', async () => {
    const onAction = vi.fn<(name: string) => void>();
    await mount(
      <Menu.Root>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Popup>
          <Menu.Item onAction={() => onAction('edit')}>Edit</Menu.Item>
          <Menu.Item disabled onAction={() => onAction('duplicate')}>
            Duplicate
          </Menu.Item>
          <Menu.Item onAction={() => onAction('preview')}>Preview</Menu.Item>
          <Menu.Item onAction={() => onAction('print')}>Print labels</Menu.Item>
        </Menu.Popup>
      </Menu.Root>,
    );
    await openByKeyboard();
    await until(() => expect(highlighted()).toBe('Edit'));
    const edit = get('menu-item');
    expect(edit.hasAttribute('data-focus-visible')).toBe(true);
    expect(getComputedStyle(edit).outlineStyle).toBe('solid');
    // The ring is drawn inside the row, which sits in a scrolling list (§8.5 data-focus-inset).
    expect(getComputedStyle(edit).outlineOffset).toBe('-2px');

    await userEvent.keyboard('{ArrowDown}');
    expect(highlighted()).toBe('Preview');
    const disabled = [...document.querySelectorAll('[data-slot="menu-item"]')][1];
    expect(disabled?.getAttribute('aria-disabled')).toBe('true');
    expect(disabled?.hasAttribute('data-disabled')).toBe(true);
    await userEvent.keyboard('{End}');
    expect(highlighted()).toBe('Print labels');
    await userEvent.keyboard('{ArrowDown}');
    expect(highlighted()).toBe('Edit');
    await userEvent.keyboard('{Home}');
    expect(highlighted()).toBe('Edit');
    await userEvent.keyboard('pr');
    expect(highlighted()).toBe('Preview');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).toBeNull());
    expect(onAction.mock.calls).toEqual([['preview']]);
    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));

    // A disabled item ignores the pointer, and the menu stays open.
    await userEvent.click(get('menu-trigger'));
    await until(() => expect(find('menu-popup')).not.toBeNull());
    const item = [...document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]')][1];
    if (item === undefined) throw new Error('no item');
    await userEvent.click(item, { force: true });
    expect(onAction.mock.calls).toEqual([['preview']]);
    expect(find('menu-popup')).not.toBeNull();
  });

  test('Tab and Shift+Tab leave the menu: it closes and focus moves past its trigger (§12.2)', async () => {
    await mount(
      <>
        {/* tabIndex: WebKit leaves plain buttons out of the Tab order, as Safari does by default */}
        <button type="button" tabIndex={0}>
          Before
        </button>
        <Menu.Root>
          <Menu.Trigger>Actions</Menu.Trigger>
          <Menu.Popup>
            <Menu.Item>Edit</Menu.Item>
            <Menu.Item>Archive</Menu.Item>
          </Menu.Popup>
        </Menu.Root>
        <button type="button" tabIndex={0}>
          After
        </button>
      </>,
    );
    await userEvent.keyboard('{Tab}');
    await openByKeyboard();
    await userEvent.keyboard('{Tab}');
    await until(() => expect(find('menu-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement?.textContent).toBe('After');

    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).not.toBeNull());
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await until(() => expect(find('menu-popup')).toBeNull());
    await settle(100);
    expect(document.activeElement?.textContent).toBe('Before');
  });

  test('link items render an <a> with href, through href or a render element (§9.3 rule 3)', async () => {
    await mount(
      <Menu.Root>
        <Menu.Trigger>Order</Menu.Trigger>
        <Menu.Popup>
          <Menu.Item href="#open" target="_self">
            Open order
          </Menu.Item>
          {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the item's children name it */}
          <Menu.Item render={<a href="#invoice" title="Invoice" />}>Download invoice</Menu.Item>
          <Menu.Item>Archive</Menu.Item>
        </Menu.Popup>
      </Menu.Root>,
    );
    await openByKeyboard();
    const [open, invoice, archive] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]'),
    ];
    expect(open?.localName).toBe('a');
    expect(open?.getAttribute('href')).toBe('#open');
    expect(open?.getAttribute('target')).toBe('_self');
    expect(open?.getAttribute('role')).toBe('menuitem');
    expect(invoice?.localName).toBe('a');
    expect(invoice?.getAttribute('href')).toBe('#invoice');
    expect(invoice?.getAttribute('title')).toBe('Invoice');
    expect(invoice?.className).toBe('nz-menu-item');
    expect(archive?.localName).toBe('div');
    expectContract();

    // Enter follows the link and closes the menu.
    await userEvent.keyboard('{Enter}');
    await until(() => expect(location.hash).toBe('#open'));
    await until(() => expect(find('menu-popup')).toBeNull());
    history.replaceState(null, '', location.pathname);
  });

  test('checkbox items toggle in place, keep the menu open and report checked state', async () => {
    const changes: boolean[] = [];
    function Columns(): JSX.Element {
      const [vendor, setVendor] = useState(false);
      return (
        <Menu.Root>
          <Menu.Trigger>View</Menu.Trigger>
          <Menu.Popup>
            <Menu.Group>
              <Menu.GroupLabel>Columns</Menu.GroupLabel>
              <Menu.CheckboxItem defaultChecked>Status</Menu.CheckboxItem>
              <Menu.CheckboxItem
                checked={vendor}
                onCheckedChange={(checked, details) => {
                  expect(details.reason).toBe('item-press');
                  changes.push(checked);
                  setVendor(checked);
                }}
              >
                Vendor
              </Menu.CheckboxItem>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Root>
      );
    }
    await mount(<Columns />);
    await openByKeyboard();
    const [status, vendor] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="menu-checkbox-item"]'),
    ];
    if (status === undefined || vendor === undefined) throw new Error('no items');
    expect(status.getAttribute('role')).toBe('menuitemcheckbox');
    expect(status.getAttribute('aria-checked')).toBe('true');
    expect(status.hasAttribute('data-checked')).toBe(true);
    expect(vendor.getAttribute('aria-checked')).toBe('false');
    expect(getComputedStyle(indicator(vendor)).visibility).toBe('hidden');

    await userEvent.keyboard('{Enter}');
    expect(status.getAttribute('aria-checked')).toBe('false');
    expect(status.hasAttribute('data-checked')).toBe(false);
    expect(find('menu-popup')).not.toBeNull();
    await userEvent.click(vendor);
    await until(() => expect(vendor.getAttribute('aria-checked')).toBe('true'));
    expect(changes).toEqual([true]);
    expect(getComputedStyle(indicator(vendor)).visibility).toBe('visible');
    expect(find('menu-popup')).not.toBeNull();
    expectContract();

    // Uncontrolled state outlives the popup, which unmounts on close.
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('menu-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).not.toBeNull());
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="menu-checkbox-item"]')];
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });

  test('radio items: one choice per group, menuitemradio semantics, and choosing closes the menu', async () => {
    const values: string[] = [];
    await mount(
      <Menu.Root>
        <Menu.Trigger>Density</Menu.Trigger>
        <Menu.Popup>
          <Menu.RadioGroup defaultValue="comfortable" onValueChange={(value) => values.push(value)}>
            <Menu.GroupLabel>Density</Menu.GroupLabel>
            <Menu.RadioItem value="comfortable">Comfortable</Menu.RadioItem>
            <Menu.RadioItem value="compact">Compact</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Popup>
      </Menu.Root>,
    );
    await openByKeyboard();
    const group = get('menu-radio-group');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-labelledby')).toBe(get('menu-group-label').id);
    const [comfortable, compact] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="menu-radio-item"]'),
    ];
    expect(comfortable?.getAttribute('role')).toBe('menuitemradio');
    expect(comfortable?.getAttribute('aria-checked')).toBe('true');
    expect(comfortable?.hasAttribute('data-checked')).toBe(true);
    expect(compact?.getAttribute('aria-checked')).toBe('false');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).toBeNull());
    expect(values).toEqual(['compact']);

    await until(() => expect(document.activeElement).toBe(get('menu-trigger')));
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).not.toBeNull());
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="menu-radio-item"]')];
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });

  test('an IconButton composes into the trigger and keeps the menu semantics (figma/13 §4.6)', async () => {
    await mount(
      <Menu.Root>
        <Menu.Trigger
          render={<IconButton label="More actions" icon={<b>…</b>} tooltip={false} />}
        />
        <Menu.Popup align="end">
          <Menu.Item>Archive</Menu.Item>
        </Menu.Popup>
      </Menu.Root>,
    );
    const trigger = get('menu-trigger');
    expect(trigger.localName).toBe('button');
    expect(trigger.className).toBe('nz-icon-button nz-hit-target nz-menu-trigger');
    expect(trigger.getAttribute('aria-label')).toBe('More actions');
    await userEvent.click(trigger);
    await until(() => expect(find('menu-popup')).not.toBeNull());
    const popup = get('menu-popup');
    expect(popup.dataset['align']).toBe('end');
    expect(popup.dataset['side']).toBe('bottom');
    await until(() => expect(paintsOnTop(popup)).toBe(true));
    // A 12 rem minimum: a menu opened from a 32 px icon is still as wide as its rows need.
    expect(popup.offsetWidth).toBeGreaterThanOrEqual(192);
  });

  test('an IconButton with its default tooltip still opens the menu, and the tooltip names it on focus', async () => {
    await mount(
      <Menu.Root>
        <Menu.Trigger render={<IconButton label="More actions" icon={<b>…</b>} />} />
        <Menu.Popup align="end">
          <Menu.Item>Archive</Menu.Item>
        </Menu.Popup>
      </Menu.Root>,
    );
    await userEvent.keyboard('{Tab}');
    const trigger = get('menu-trigger');
    expect(document.activeElement).toBe(trigger);
    await until(() => expect(find('tooltip-popup')?.textContent).toBe('More actions'));
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('menu-popup')).not.toBeNull());
    await until(() => expect(find('tooltip-popup')).toBeNull());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('menu-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(trigger));
    await userEvent.click(trigger);
    await until(() => expect(find('menu-popup')).not.toBeNull());
  });

  test('Popup aria-label names the menu instead of the trigger', async () => {
    await mount(
      <Menu.Root>
        <Menu.Trigger aria-label="More">…</Menu.Trigger>
        <Menu.Popup aria-label="Sort orders">
          <Menu.Item>Newest first</Menu.Item>
        </Menu.Popup>
      </Menu.Root>,
    );
    await openByKeyboard();
    const list = get('menu-list');
    expect(list.getAttribute('aria-label')).toBe('Sort orders');
    expect(list.hasAttribute('aria-labelledby')).toBe(false);
  });
});

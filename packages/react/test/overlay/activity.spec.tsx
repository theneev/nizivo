// O-15 Activity hide and show (ARCHITECTURE.md §12.2 "Activity", §12.5), as Next's cacheComponents
// hides a route: open an overlay, hide its route under <Activity>, and the overlay is not visible,
// <html> is not scroll-locked and nothing on the visible route is inert; show the route again and
// the overlay is closed. An uncontrolled Dialog closes with reason 'hidden'; a controlled one gets
// onOpenChange(false, { reason: 'hidden' }) and the app decides. Runs on React 19.3 and, in the
// `overlay-react-19.2` lane, on 19.2 (test/react-matrix.ts).
import { Activity, useEffect, useState, type JSX, type ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Dialog } from '../../src/dialog/index';
import { Drawer } from '../../src/drawer/index';
import { Menu } from '../../src/menu/index';
import { Popover } from '../../src/popover/index';
import { Select } from '../../src/select/index';
import { toast, Toaster } from '../../src/toast/index';
import { Tooltip } from '../../src/tooltip/index';
import { find, get, locked, mount, parkPointer, settle, until } from './harness';

type Mode = 'visible' | 'hidden';
let route: (mode: Mode) => void = () => undefined;

/** Two routes, as a router with Activity keeps them: `route('hidden')` shows the other one. */
function Routes({ children }: { children: ReactNode }): JSX.Element {
  const [mode, setMode] = useState<Mode>('visible');
  useEffect(() => {
    route = setMode;
  }, []);
  return (
    <>
      <Activity mode={mode}>
        <main data-route="first">{children}</main>
      </Activity>
      <Activity mode={mode === 'visible' ? 'hidden' : 'visible'}>
        <main data-route="second">
          <button type="button">Back to orders</button>
        </main>
      </Activity>
    </>
  );
}

function other(): HTMLElement {
  const button = document.querySelector<HTMLElement>('[data-route="second"] button');
  if (button === null) throw new Error('no second route');
  return button;
}

/** Hidden: the popup is gone or not rendered, the page is not locked, the visible route is live. */
async function expectHidden(popup: string): Promise<void> {
  await until(() => {
    const element = find(popup);
    expect(element === null || !element.checkVisibility()).toBe(true);
  });
  await until(() => expect(locked()).toBe(false));
  expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  expect(other().closest('[aria-hidden="true"]')).toBeNull();
  // Focusable: not inert. (WebKit on macOS does not focus a button on a click.)
  other().focus();
  expect(document.activeElement).toBe(other());
}

/**
 * Shown again: the popup stays closed. The pointer is parked first: the first route's trigger comes
 * back where the second route's button was clicked, and a Tooltip would open on that hover.
 */
async function expectClosedOnReturn(popup: string): Promise<void> {
  await parkPointer();
  route('visible');
  await until(() => expect(other().checkVisibility()).toBe(false));
  await settle(300);
  expect(find(popup)).toBeNull();
}

interface Case {
  name: string;
  app: (onOpenChange: (open: boolean, details: { reason: string }) => void) => JSX.Element;
  trigger: string;
  popup: string;
  open?: 'click' | 'hover';
}

const CASES: Case[] = [
  {
    name: 'Menu',
    app: (onOpenChange) => (
      <Menu.Root onOpenChange={onOpenChange}>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Popup>
          <Menu.Item>Rename…</Menu.Item>
          <Menu.Item>Archive</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
    ),
    trigger: 'menu-trigger',
    popup: 'menu-popup',
  },
  {
    name: 'Select',
    app: (onOpenChange) => (
      <Select.Root aria-label="Period" defaultValue="30d" onOpenChange={onOpenChange}>
        <Select.Trigger />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
        </Select.Popup>
      </Select.Root>
    ),
    trigger: 'select-trigger',
    popup: 'select-popup',
  },
  {
    name: 'Popover',
    app: (onOpenChange) => (
      <Popover.Root onOpenChange={onOpenChange}>
        <Popover.Trigger>Store status</Popover.Trigger>
        <Popover.Popup>
          <Popover.Title>Store is live</Popover.Title>
          <button type="button">Pause store</button>
        </Popover.Popup>
      </Popover.Root>
    ),
    trigger: 'popover-trigger',
    popup: 'popover-popup',
  },
  {
    name: 'Tooltip',
    app: (onOpenChange) => (
      <Tooltip.Root delay={0} onOpenChange={onOpenChange}>
        <Tooltip.Trigger>Export</Tooltip.Trigger>
        <Tooltip.Popup>Download the report</Tooltip.Popup>
      </Tooltip.Root>
    ),
    trigger: 'tooltip-trigger',
    popup: 'tooltip-popup',
    open: 'hover',
  },
  {
    name: 'Dialog (uncontrolled)',
    app: (onOpenChange) => (
      <Dialog.Root onOpenChange={onOpenChange}>
        <Dialog.Trigger>Rename</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Rename</Dialog.Title>
          <Dialog.Body>
            <input aria-label="Name" />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>
    ),
    trigger: 'dialog-trigger',
    popup: 'dialog-popup',
  },
  {
    name: 'Drawer (uncontrolled)',
    app: (onOpenChange) => (
      <Drawer.Root onOpenChange={onOpenChange}>
        <Drawer.Trigger>Order #1042</Drawer.Trigger>
        <Drawer.Popup>
          <Drawer.Title>Order #1042</Drawer.Title>
          <Drawer.Body>Paid</Drawer.Body>
        </Drawer.Popup>
      </Drawer.Root>
    ),
    trigger: 'drawer-trigger',
    popup: 'drawer-popup',
  },
];

/** A controlled Dialog whose app ignores the 'hidden' close. */
function KeptOpen(): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, details) => {
        if (details.reason !== 'hidden') setOpen(next);
      }}
    >
      <Dialog.Trigger>Rename</Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Title>Rename</Dialog.Title>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

describe('O-15 Activity hide and show', () => {
  for (const c of CASES) {
    test(`${c.name}: hiding the route closes it with reason 'hidden'; it stays closed on return`, async () => {
      const onOpenChange = vi.fn<(open: boolean, details: { reason: string }) => void>();
      await mount(<Routes>{c.app(onOpenChange)}</Routes>);
      if (c.open === 'hover') await userEvent.hover(get(c.trigger));
      else await userEvent.click(get(c.trigger));
      await until(() => expect(find(c.popup)?.checkVisibility()).toBe(true));

      route('hidden');
      await expectHidden(c.popup);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: 'hidden' });
      await expectClosedOnReturn(c.popup);
    });
  }

  test('a controlled Dialog: onOpenChange(false, hidden) fires, and the app closes it', async () => {
    const seen: string[] = [];
    function App(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <Dialog.Root
          open={open}
          onOpenChange={(next, details) => {
            seen.push(`${String(next)} ${details.reason}`);
            setOpen(next);
          }}
        >
          <Dialog.Trigger>Rename</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Rename</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
      );
    }
    await mount(
      <Routes>
        <App />
      </Routes>,
    );
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    route('hidden');
    await expectHidden('dialog-popup');
    expect(seen.at(-1)).toBe('false hidden');
    await expectClosedOnReturn('dialog-popup');
  });

  test('a controlled Dialog the app keeps open: the app decides, and on React 19.2 it stays on screen', async () => {
    await mount(
      <Routes>
        <KeptOpen />
      </Routes>,
    );
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    route('hidden');
    await until(() =>
      expect(document.querySelector('[data-route="first"]')?.checkVisibility()).toBe(false),
    );
    await settle(300);
    // React 19.3 hides a portal under a hidden Activity; React 19.2 does not (§12.2 "Activity").
    expect(find('dialog-popup')?.checkVisibility()).toBe(NZ_REACT_LINE === '19.2');
    route('visible');
    await until(() => expect(find('dialog-popup')?.checkVisibility()).toBe(true));
  });

  test('Strict Mode: a Dialog open at mount is not closed by the mount, cleanup, mount', async () => {
    await mount(
      <Routes>
        <Dialog.Root defaultOpen>
          <Dialog.Popup>
            <Dialog.Title>Welcome</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
      </Routes>,
      { strict: true },
    );
    await until(() => expect(find('dialog-popup')?.checkVisibility()).toBe(true));
    await settle(200);
    expect(find('dialog-popup')).not.toBeNull();
  });

  test('a Toaster on a hidden route: its stack is not shown, and is back in the top layer on return', async () => {
    await mount(
      <Routes>
        <Toaster />
      </Routes>,
    );
    toast('Order #1042 archived', { action: { label: 'Undo', onAction: () => undefined } });
    await until(() => expect(get('toast-region').matches(':popover-open')).toBe(true));
    route('hidden');
    await until(() => expect(get('toast-region').checkVisibility()).toBe(false));
    route('visible');
    await until(() => {
      expect(get('toast-region').matches(':popover-open')).toBe(true);
      expect(get('toast-region').checkVisibility()).toBe(true);
    });
    toast.dismiss();
  });
});

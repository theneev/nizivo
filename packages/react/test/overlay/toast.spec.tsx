// Toast against the overlay family (ARCHITECTURE.md §12.5 v0.2, §12.6, §12.1 L3): the region in the
// top layer and exempt from a modal's hiding, the announcer, the keyboard path (F8, Tab, Escape), and
// the cases that gate Toast: O-06 (a toast over a modal), O-07 (a toast created before a modal),
// O-13 (focus not obscured by the stack) and O-14 (timing).
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Dialog } from '../../src/dialog/index';
import { toast, Toaster } from '../../src/toast/index';
import { expectContract, find, get, mount, settle, until } from './harness';

afterEach(() => {
  toast.dismiss();
});

function all(slot: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)];
}

/** What a modal hides: an ancestor (or the element) marked aria-hidden or inert. */
function hidden(element: Element): boolean {
  return element.closest('[aria-hidden="true"], [inert]') !== null;
}

function spoken(politeness: 'polite' | 'assertive'): string {
  return get('toast-announcer').querySelector(`[aria-live="${politeness}"]`)?.textContent ?? '';
}

const undo = { label: 'Undo', onAction: () => {} };

/**
 * Tab once, expecting `to`. WebKit on macOS may skip a button on Tab: focus it by script right after
 * the key press, which keeps the keyboard modality (as dialog.spec.tsx does).
 */
async function tabTo(to: HTMLElement | undefined): Promise<void> {
  if (to === undefined) throw new Error('nothing to Tab to');
  await userEvent.tab();
  if (document.activeElement !== to) to.focus();
  expect(document.activeElement).toBe(to);
}

describe('Toast', () => {
  test('a toast shows in the top layer, bottom-centre, as a labelled non-modal alertdialog', async () => {
    await mount(<Toaster />);
    expect(find('toast-region')?.hidden).toBe(true);
    toast('Order #1042 archived', { action: undo });
    await until(() => expect(find('toast')).not.toBeNull());
    const region = get('toast-region');
    const item = get('toast');
    // in the top layer where the Popover API exists (every engine of the lanes), else fixed
    expect(!('showPopover' in region) || region.matches(':popover-open')).toBe(true);
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('Notifications (F8)');
    expect(item.getAttribute('role')).toBe('alertdialog');
    expect(item.getAttribute('aria-modal')).toBe('false');
    expect(item.getAttribute('aria-labelledby')).toBe(get('toast-message').id);
    expect(item.hasAttribute('aria-describedby')).toBe(false);
    expect(item.getAttribute('data-nz-scheme')).toBe('inverse');
    // never live itself: the announcer speaks it, once
    expect(region.querySelector('[role="alert"], [role="status"], [aria-live]')).toBeNull();
    const box = item.getBoundingClientRect();
    expect(Math.abs(box.left + box.width / 2 - window.innerWidth / 2)).toBeLessThan(1);
    expect(window.innerHeight - box.bottom).toBeGreaterThan(0);
    expect(get('toast-action').textContent).toBe('Undo');
    expect(get('toast-close').getAttribute('aria-label')).toBe('Dismiss');
    expectContract();
  });

  test('the announcer exists before any toast and speaks each once, critical assertively', async () => {
    await mount(<Toaster />);
    const announcer = get('toast-announcer');
    expect(spoken('polite')).toBe('');
    toast('Product saved', { tone: 'success', description: 'It is live.' });
    await until(() => expect(spoken('polite')).toBe('Product saved. It is live.'));
    toast('Couldn’t publish 2 products', { tone: 'critical' });
    await until(() => expect(spoken('assertive')).toBe('Couldn’t publish 2 products'));
    expect(get('toast-announcer')).toBe(announcer);
  });

  test('F8 moves focus to the stack and back; Escape dismisses the focused toast', async () => {
    await mount(
      <>
        <button type="button">Save</button>
        <Toaster />
      </>,
    );
    const save = document.querySelector('button');
    if (save === null) throw new Error('no button');
    save.focus();
    toast('Product saved', { action: { label: 'View', onAction: () => {} } });
    toast('Order archived', { action: undo });
    await until(() => expect(all('toast')).toHaveLength(2));
    await userEvent.keyboard('{F8}');
    expect(document.activeElement).toBe(get('toast-region'));
    await userEvent.keyboard('{F8}');
    expect(document.activeElement).toBe(save);
    await userEvent.keyboard('{F8}');
    await tabTo(all('toast')[0]);
    await tabTo(all('toast-action')[0]);
    await userEvent.keyboard('{Escape}');
    await until(() => expect(all('toast')).toHaveLength(1));
    // the engine moves focus to the toast that is left, not to <body>
    await until(() => expect(get('toast').contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await until(() => expect(all('toast')).toHaveLength(0));
    await until(() => expect(document.activeElement).toBe(save));
  });

  test('an action runs once and closes its toast; Dismiss closes it', async () => {
    const onAction = vi.fn<() => void>();
    await mount(<Toaster />);
    toast('Order archived', { action: { label: 'Undo', onAction } });
    toast('Product saved');
    await until(() => expect(all('toast')).toHaveLength(2));
    await userEvent.click(get('toast-action'));
    expect(onAction).toHaveBeenCalledOnce();
    await until(() => expect(all('toast')).toHaveLength(1));
    await userEvent.click(get('toast-close'));
    await until(() => expect(all('toast')).toHaveLength(0));
    expect(find('toast-region')?.hidden).toBe(true);
  });

  test('`limit` shows the newest; an older toast waits and returns', async () => {
    await mount(<Toaster limit={2} />);
    toast('One', { action: undo });
    toast('Two', { action: undo });
    toast('Three', { action: undo });
    await until(() =>
      expect(all('toast-message').map((m) => m.textContent)).toEqual(['Two', 'Three']),
    );
    toast.dismiss(toast('Four', { action: undo }));
    await userEvent.click(all('toast-close')[1] ?? get('toast-close'));
    await until(() =>
      expect(all('toast-message').map((m) => m.textContent)).toEqual(['One', 'Two']),
    );
  });
});

describe('Toast with modals (§12.5 v0.2)', () => {
  const modal = (
    <Dialog.Root>
      <Dialog.Trigger>Edit order</Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Title>Edit order</Dialog.Title>
        <Dialog.Body>
          <button type="button">Save</button>
        </Dialog.Body>
      </Dialog.Popup>
    </Dialog.Root>
  );

  test('O-06 a toast over a modal: F8 reaches the action, the modal stays open, nothing hides the toast', async () => {
    const onAction = vi.fn<() => void>();
    await mount(
      <>
        {modal}
        <Toaster />
      </>,
    );
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    toast('Order #1042 archived', { action: { label: 'Undo', onAction } });
    await until(() => expect(find('toast')).not.toBeNull());
    await settle();
    expect(hidden(get('toast-region'))).toBe(false);
    expect(hidden(get('toast-announcer'))).toBe(false);
    await userEvent.keyboard('{F8}');
    expect(document.activeElement).toBe(get('toast-region'));
    await tabTo(get('toast'));
    await tabTo(get('toast-action'));
    await userEvent.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledOnce();
    await until(() => expect(find('toast')).toBeNull());
    expect(all('dialog-popup')).toHaveLength(1);
    // Escape on a toast dismisses the toast, not the modal under it
    toast('Product saved', { action: undo });
    await until(() => expect(find('toast')).not.toBeNull());
    await userEvent.keyboard('{F8}');
    await tabTo(get('toast'));
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('toast')).toBeNull());
    expect(all('dialog-popup')).toHaveLength(1);
  });

  test('O-07 a toast created before a modal stays reachable, and pressing it leaves the modal open', async () => {
    const onAction = vi.fn<() => void>();
    await mount(
      <>
        {modal}
        <Toaster />
      </>,
    );
    toast('Order #1042 archived', { action: { label: 'Undo', onAction } });
    await until(() => expect(find('toast')).not.toBeNull());
    await userEvent.click(get('dialog-trigger'));
    await until(() => expect(all('dialog-popup')).toHaveLength(1));
    await settle();
    expect(hidden(get('toast-region'))).toBe(false);
    await userEvent.click(get('toast-action'));
    expect(onAction).toHaveBeenCalledOnce();
    await settle();
    expect(all('dialog-popup')).toHaveLength(1);
  });

  test('O-13 the stack’s height feeds scroll-padding, so focus is not left under it (WCAG 2.4.11)', async () => {
    await mount(<Toaster />);
    toast('Product saved', { action: undo });
    await until(() => expect(find('toast')).not.toBeNull());
    const region = get('toast-region');
    const inset = window.innerHeight - region.getBoundingClientRect().top;
    await until(() => {
      const value = parseFloat(document.documentElement.style.getPropertyValue('--nz-toast-inset'));
      expect(Math.abs(value - inset)).toBeLessThanOrEqual(1);
    });
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom);
    expect(padding).toBeGreaterThanOrEqual(inset - 1);
    toast.dismiss();
    await until(() =>
      expect(document.documentElement.style.getPropertyValue('--nz-toast-inset')).toBe(''),
    );
  });

  test('O-14 timing: a plain toast leaves on time, not while hovered; action and critical stay', async () => {
    await mount(<Toaster />);
    toast('Kept', { timeout: 300, action: undo });
    toast('Failed', { timeout: 300, tone: 'critical' });
    toast('Saved', { timeout: 300 });
    await until(() => expect(all('toast')).toHaveLength(3));
    await userEvent.hover(get('toast-region'));
    await settle(600);
    expect(all('toast')).toHaveLength(3);
    await userEvent.unhover(get('toast-region'));
    await until(() =>
      expect(all('toast-message').map((m) => m.textContent)).toEqual(['Kept', 'Failed']),
    );
    await settle(600);
    expect(all('toast')).toHaveLength(2);
  });
});

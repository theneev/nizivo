// Dialog against the react-aria family's overlay conformance (ARCHITECTURE.md §10.4, §12.3 Dialog row).
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Dialog } from '../../src/dialog/index';
import { describeOverlay } from './conformance';
import { find, get, mount, until } from './harness';

function dialogAria(trigger: HTMLElement, popup: HTMLElement): void {
  const content = get('dialog-content', popup);
  expect(content.getAttribute('role')).toBe('dialog');
  expect(content.getAttribute('aria-labelledby')).toBe(get('dialog-title', popup).id);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  // One backdrop, inside the positioner, before the popup (§10.4).
  const backdrops = document.querySelectorAll('[data-slot="dialog-backdrop"]');
  expect(backdrops).toHaveLength(1);
  expect(backdrops[0]?.getAttribute('aria-hidden')).toBe('true');
}

describeOverlay({
  name: 'Dialog',
  app: ({ defaultOpen, container } = {}) => (
    <Dialog.Root {...(defaultOpen === undefined ? {} : { defaultOpen })}>
      <Dialog.Trigger>Edit product</Dialog.Trigger>
      <Dialog.Popup {...(container === undefined ? {} : { container })}>
        <Dialog.Title>Edit product</Dialog.Title>
        <Dialog.Description>Changes save when you close.</Dialog.Description>
        <Dialog.Body>
          <input aria-label="Name" defaultValue="Stoneware mug" />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close>Done</Dialog.Close>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Root>
  ),
  trigger: 'dialog-trigger',
  popup: 'dialog-popup',
  portalRoot: 'dialog-positioner',
  pointer: 'press',
  keys: ['{Enter}', ' '],
  focus: 'inside',
  outsidePress: true,
  scrollLock: true,
  scales: true,
  aria: dialogAria,
});

async function openDialog(): Promise<void> {
  await userEvent.click(get('dialog-trigger'));
  await until(() => expect(find('dialog-popup')).not.toBeNull());
}

describe('Dialog focus on open (§12.2)', () => {
  test('a dialog focuses the first tabbable element in its body', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Rename</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Rename</Dialog.Title>
          <Dialog.Body>
            <p>Shown on the storefront.</p>
            <input aria-label="Name" disabled />
            <input aria-label="Display name" />
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    await until(() =>
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Display name'),
    );
  });

  test('an alertdialog focuses its least destructive action, the Close part', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Delete</Dialog.Trigger>
        <Dialog.Popup role="alertdialog">
          <Dialog.Title>Delete product?</Dialog.Title>
          <Dialog.Description>This can't be undone.</Dialog.Description>
          <Dialog.Footer>
            <button type="button">Delete</button>
            <Dialog.Close>Cancel</Dialog.Close>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    await until(() => expect(document.activeElement).toBe(get('dialog-close')));
  });

  test('without a tabbable body element the popup itself takes focus, and autoFocus wins', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Terms</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Terms</Dialog.Title>
          <Dialog.Body>Long text.</Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    await until(() => expect(document.activeElement).toBe(get('dialog-content')));
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('dialog-popup')).toBeNull());

    document.body.replaceChildren();
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Search</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Search</Dialog.Title>
          <Dialog.Body>
            <input aria-label="First" />
            {/* oxlint-disable-next-line jsx-a11y/no-autofocus -- the case under test */}
            <input aria-label="Query" autoFocus />
          </Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    await until(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Query'));
  });
});

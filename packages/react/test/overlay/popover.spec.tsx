// Popover against the react-aria family's overlay conformance (ARCHITECTURE.md §12.3 Popover row).
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Button } from '../../src/button/index';
import { Popover } from '../../src/popover/index';
import { describeOverlay } from './conformance';
import { expectContract, find, get, mount, until } from './harness';

function popoverAria(trigger: HTMLElement, popup: HTMLElement): void {
  const content = get('popover-content', popup);
  expect(content.getAttribute('role')).toBe('dialog');
  expect(content.getAttribute('aria-labelledby')).toBe(get('popover-title', popup).id);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
}

describeOverlay({
  name: 'Popover',
  app: ({ defaultOpen, container } = {}) => (
    <Popover.Root {...(defaultOpen === undefined ? {} : { defaultOpen })}>
      <Popover.Trigger>Store status</Popover.Trigger>
      <Popover.Popup {...(container === undefined ? {} : { container })}>
        <Popover.Title>Store is live</Popover.Title>
        <Popover.Close />
        <Popover.Description>Customers can see 42 products.</Popover.Description>
        <button type="button">Pause store</button>
      </Popover.Popup>
    </Popover.Root>
  ),
  trigger: 'popover-trigger',
  popup: 'popover-popup',
  pointer: 'press',
  keys: ['{Enter}', ' '],
  focus: 'inside',
  outsidePress: true,
  scrollLock: true,
  scales: true,
  aria: popoverAria,
});

describe('Popover behaviour', () => {
  test('focus on open goes to the first control, past the corner close', async () => {
    await mount(
      <Popover.Root>
        <Popover.Trigger>Store status</Popover.Trigger>
        <Popover.Popup>
          <Popover.Title>Store is live</Popover.Title>
          <Popover.Close />
          <button type="button">Pause store</button>
        </Popover.Popup>
      </Popover.Root>,
    );
    await userEvent.click(get('popover-trigger'));
    await until(() => expect(document.activeElement?.textContent).toBe('Pause store'));
    expectContract();
    await userEvent.click(get('popover-close'));
    await until(() => expect(find('popover-popup')).toBeNull());
    await until(() => expect(document.activeElement).toBe(get('popover-trigger')));
  });
});

describe('Popover.Trigger target size (WCAG 2.2 2.5.8)', () => {
  test('a bare one-character trigger is at least 24 x 24 px; a composed Button keeps its own size and classes', async () => {
    await mount(
      <div style={{ display: 'flex' }}>
        <Popover.Root>
          <Popover.Trigger>?</Popover.Trigger>
          <Popover.Popup aria-label="Help">Help</Popover.Popup>
        </Popover.Root>
        <Popover.Root>
          <Popover.Trigger render={<Button size="sm">Status</Button>} />
          <Popover.Popup aria-label="Status">Live</Popover.Popup>
        </Popover.Root>
      </div>,
    );
    const [bare, composed] = document.querySelectorAll<HTMLElement>(
      '[data-slot="popover-trigger"]',
    );
    if (bare === undefined || composed === undefined) throw new Error('no triggers');
    expect(bare.className).toBe('nz-popover-trigger nz-hit-target');
    const { width, height } = bare.getBoundingClientRect();
    expect(width).toBeGreaterThanOrEqual(24);
    expect(height).toBeGreaterThanOrEqual(24);
    expect(composed.className).toBe('nz-button nz-hit-target nz-popover-trigger');
    expect(composed.dataset['size']).toBe('sm');
    expect(Math.round(composed.getBoundingClientRect().height)).toBe(32);
  });
});

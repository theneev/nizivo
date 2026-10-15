// Tooltip against the react-aria family's overlay conformance (ARCHITECTURE.md §12.3 Tooltip row).
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Tooltip } from '../../src/tooltip/index';
import { describeOverlay } from './conformance';
import { get, mount, settle, until } from './harness';

// React Aria keeps tooltips "warm" for 500 ms after one closes, and a warm tooltip opens without its
// entry animation (as native tooltips do); one left open keeps the page warm. Each case closes its
// tooltip and lets the page cool down, so the next one starts cold.
afterEach(async () => {
  await userEvent.keyboard('{Escape}');
  await settle(600);
});

function tooltipAria(trigger: HTMLElement, popup: HTMLElement): void {
  expect(popup.getAttribute('role')).toBe('tooltip');
  expect(trigger.getAttribute('aria-describedby')?.split(' ')).toContain(popup.id);
  expect(popup.dataset['nzScheme']).toBe('inverse');
}

describeOverlay({
  name: 'Tooltip',
  app: ({ defaultOpen, container } = {}) => (
    <Tooltip.Root delay={0} {...(defaultOpen === undefined ? {} : { defaultOpen })}>
      <Tooltip.Trigger>Export</Tooltip.Trigger>
      <Tooltip.Popup {...(container === undefined ? {} : { container })} shortcut="mod+e">
        Download the report
      </Tooltip.Popup>
    </Tooltip.Root>
  ),
  trigger: 'tooltip-trigger',
  popup: 'tooltip-popup',
  pointer: 'hover',
  keys: 'focus',
  focus: 'trigger',
  outsidePress: false,
  scrollLock: false,
  scales: false,
  aria: tooltipAria,
});

/** Every Tooltip popup in the document, by its text. */
function popups(text: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="tooltip-popup"]')].filter(
    (popup) => popup.textContent === text,
  );
}

describe('Tooltip behaviour', () => {
  test('a press after Tab moved across tooltips leaves no unpositioned popup in data-exiting (React Aria 1.22.1)', async () => {
    await mount(
      <>
        <button type="button">Before</button>
        <Tooltip.Root>
          <Tooltip.Trigger>Export</Tooltip.Trigger>
          <Tooltip.Popup>Download the report</Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>Print</Tooltip.Trigger>
          <Tooltip.Popup>Print the labels</Tooltip.Popup>
        </Tooltip.Root>
        <button type="button">After</button>
      </>,
    );
    const [exportTrigger] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="tooltip-trigger"]'),
    ];
    if (exportTrigger === undefined) throw new Error('no trigger');
    // Keyboard focus opens Export's tooltip; moving on while it is warm swaps it for Print's
    // instantly, cutting Export's exit short, and leaving closes Print's.
    document.querySelector<HTMLElement>('button')?.focus();
    await userEvent.keyboard('{Tab}');
    await until(() => expect(document.activeElement).toBe(exportTrigger));
    await until(() => expect(popups('Download the report')).toHaveLength(1));
    // Fully in, so leaving starts a real exit transition, which the swap then cuts short.
    await until(() => expect(popups('Download the report')[0]?.getAnimations()).toEqual([]));
    await userEvent.keyboard('{Tab}');
    await until(() => expect(popups('Print the labels')).toHaveLength(1));
    expect(popups('Download the report')).toHaveLength(0);
    await userEvent.keyboard('{Tab}');
    await until(() => expect(popups('Print the labels')).toHaveLength(0));
    // A press on Export, the pointer arriving with the keyboard still the modality: the press closes
    // the (closed) tooltip, which must not bring back a popup stuck mid-exit.
    await userEvent.click(exportTrigger);
    await settle(800);
    expect(popups('Download the report')).toEqual([]);
    expect(get('tooltip-trigger').hasAttribute('data-open')).toBe(false);
  });
});

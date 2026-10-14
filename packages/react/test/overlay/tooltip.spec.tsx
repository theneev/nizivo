// Tooltip against the react-aria family's overlay conformance (ARCHITECTURE.md §12.3 Tooltip row).
import { afterEach, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Tooltip } from '../../src/tooltip/index';
import { describeOverlay } from './conformance';
import { settle } from './harness';

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

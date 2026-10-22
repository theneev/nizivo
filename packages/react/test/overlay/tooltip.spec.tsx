// Tooltip against the react-aria family's overlay conformance (ARCHITECTURE.md §12.3 Tooltip row).
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Button } from '../../src/button/index';
import { IconButton } from '../../src/icon-button/index';
import { Tooltip } from '../../src/tooltip/index';
import { describeOverlay } from './conformance';
import { get, mount, parkPointer, settle, until } from './harness';

// React Aria keeps tooltips "warm" for 500 ms after one closes, and a warm tooltip opens without its
// entry animation (as native tooltips do); one left open keeps the page warm. Each case closes its
// tooltip and lets the page cool down, so the next one starts cold.
//
// It also parks the real pointer (parkPointer in harness.tsx). A hover case leaves the pointer over
// its trigger, and the next case mounts a trigger in the same place: WebKit then updates the hover state on its own, about 150 ms into the case, with
// a trusted pointerover and pointerenter and no pointermove. React Aria 1.22.1 takes that for a hover
// start, and a trigger that still has focus after Escape reopens its tooltip (Escape closes it from a
// capturing document listener that stops the event, so the trigger's own keydown, which clears its
// focus flag, never runs). Under load the keyboard case's Escape landed before that update, and the
// popup came back open (the WebKit flake of W7-RESULTS.md, "Process").
afterEach(async () => {
  await userEvent.keyboard('{Escape}');
  await parkPointer();
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

// M27: a bare Tooltip.Trigger is its own <button>, so it gets a minimum target of its own (WCAG 2.2
// 2.5.8, 24 x 24 CSS px) and the coarse-pointer hit area; a composed Button or IconButton keeps its
// own size, and a consumer's own element through `render` is left as it is.
const Glyph = (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

function size(element: Element): { width: number; height: number } {
  const { width, height } = element.getBoundingClientRect();
  return { width, height };
}

/** Same rendered size, to 0.01 px: Firefox reports the same box with a 1e-5 px difference. */
function expectSameSize(element: Element, reference: Element): void {
  const actual = size(element);
  const expected = size(reference);
  expect(actual.width).toBeCloseTo(expected.width, 2);
  expect(actual.height).toBeCloseTo(expected.height, 2);
}

function triggers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="tooltip-trigger"]')];
}

describe('Tooltip.Trigger target size (WCAG 2.2 2.5.8)', () => {
  test('a bare text trigger and a bare icon-only trigger are at least 24 x 24 px, side by side', async () => {
    await mount(
      <div style={{ display: 'flex' }}>
        <Tooltip.Root content="Help">
          <Tooltip.Trigger>?</Tooltip.Trigger>
        </Tooltip.Root>
        <Tooltip.Root content="Export the report">
          <Tooltip.Trigger>Export</Tooltip.Trigger>
        </Tooltip.Root>
        <Tooltip.Root content="Settings">
          <Tooltip.Trigger aria-label="Settings">{Glyph}</Tooltip.Trigger>
        </Tooltip.Root>
      </div>,
    );
    const bare = triggers();
    expect(bare).toHaveLength(3);
    for (const trigger of bare) {
      expect(trigger.className).toBe('nz-tooltip-trigger nz-hit-target');
      const { width, height } = size(trigger);
      expect(width).toBeGreaterThanOrEqual(24);
      expect(height).toBeGreaterThanOrEqual(24);
    }
  });

  test('a composed Button or IconButton keeps its own size and classes', async () => {
    await mount(
      <>
        <Button variant="tertiary">Export</Button>
        <IconButton label="Settings" icon={Glyph} variant="tertiary" size="sm" tooltip={false} />
        <Tooltip.Root content="Export the report">
          <Tooltip.Trigger render={<Button variant="tertiary">Export</Button>} />
        </Tooltip.Root>
        <Tooltip.Root content="Settings">
          <Tooltip.Trigger
            render={
              <IconButton
                label="Settings"
                icon={Glyph}
                variant="tertiary"
                size="sm"
                tooltip={false}
              />
            }
          />
        </Tooltip.Root>
      </>,
    );
    const [button, iconButton] = triggers();
    if (button === undefined || iconButton === undefined) throw new Error('no trigger');
    expect(button.className).toBe('nz-button nz-hit-target nz-tooltip-trigger');
    expect(iconButton.className).toBe('nz-icon-button nz-hit-target nz-tooltip-trigger');
    expectSameSize(button, get('button'));
    expectSameSize(iconButton, get('icon-button'));
  });

  test("a consumer's own element through render gets no minimum and no hit area", async () => {
    const container = await mount(
      <div>
        <button type="button" className="mine">
          ?
        </button>
        <Tooltip.Root content="Help">
          <Tooltip.Trigger
            render={
              <button type="button" className="mine">
                ?
              </button>
            }
          />
        </Tooltip.Root>
      </div>,
    );
    const [reference] = container.querySelectorAll('.mine');
    const [trigger] = triggers();
    if (reference === undefined || trigger === undefined) throw new Error('no trigger');
    expect(trigger.classList).not.toContain('nz-hit-target');
    expectSameSize(trigger, reference);
  });

  test('the bare trigger keeps the solid focus outline from the keyboard', async () => {
    await mount(
      <Tooltip.Root content="Settings">
        <Tooltip.Trigger aria-label="Settings">{Glyph}</Tooltip.Trigger>
      </Tooltip.Root>,
    );
    await userEvent.keyboard('{Tab}');
    const trigger = get('tooltip-trigger');
    // WebKit on macOS may skip a button on Tab: focus it by script right after the key press, which
    // keeps the keyboard modality (as the solid-outline check in test/browser does).
    if (document.activeElement !== trigger) trigger.focus();
    await until(() => expect(document.activeElement).toBe(trigger));
    const ring = getComputedStyle(trigger);
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidth).toBe('2px');
    expect(ring.outlineOffset).toBe('2px');
  });
});

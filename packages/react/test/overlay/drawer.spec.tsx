// Drawer against the react-aria family's overlay conformance (ARCHITECTURE.md §12.3 Drawer / Sheet row).
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NizivoConfig } from '../../src/config/index';
import { Drawer } from '../../src/drawer/index';
import type { DrawerSide } from '../../src/drawer/index';
import { describeOverlay } from './conformance';
import { expectContract, find, get, locked, mount, settle, until } from './harness';

function drawerAria(trigger: HTMLElement, popup: HTMLElement): void {
  const content = get('drawer-content', popup);
  expect(content.getAttribute('role')).toBe('dialog');
  expect(content.getAttribute('aria-labelledby')).toBe(get('drawer-title', popup).id);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  // One backdrop, inside the positioner, before the popup (as the Dialog's, §10.4).
  const backdrops = document.querySelectorAll('[data-slot="drawer-backdrop"]');
  expect(backdrops).toHaveLength(1);
  expect(backdrops[0]?.getAttribute('aria-hidden')).toBe('true');
}

function app(
  side?: DrawerSide,
  options: { defaultOpen?: boolean; container?: Element | null } = {},
) {
  const { defaultOpen, container } = options;
  return (
    <Drawer.Root {...(defaultOpen === undefined ? {} : { defaultOpen })}>
      <Drawer.Trigger>View order</Drawer.Trigger>
      <Drawer.Popup
        {...(side === undefined ? {} : { side })}
        {...(container === undefined ? {} : { container })}
      >
        <Drawer.Header>
          <Drawer.Title>Order #1042</Drawer.Title>
          <Drawer.Description>Paid, unfulfilled</Drawer.Description>
        </Drawer.Header>
        <Drawer.Close />
        <Drawer.Body>
          <input aria-label="Note" />
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>Done</Drawer.Close>
        </Drawer.Footer>
      </Drawer.Popup>
    </Drawer.Root>
  );
}

// At the start edge: the generic outside-press case presses a button in the bottom end corner, which
// a drawer at the end edge covers (the end edge has its own case below).
describeOverlay({
  name: 'Drawer',
  app: (options = {}) => app('start', options),
  trigger: 'drawer-trigger',
  popup: 'drawer-popup',
  portalRoot: 'drawer-positioner',
  pointer: 'press',
  keys: ['{Enter}', ' '],
  focus: 'inside',
  outsidePress: true,
  scrollLock: true,
  scales: false,
  aria: drawerAria,
});

/** Opens the drawer and waits for its slide to finish (data-entering marks only its start state). */
async function openDrawer(): Promise<HTMLElement> {
  await userEvent.click(get('drawer-trigger'));
  await until(() => expect(find('drawer-popup')).not.toBeNull());
  const popup = get('drawer-popup');
  await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
  await until(() => expect(popup.getAnimations()).toEqual([]), 3000);
  return popup;
}

describe('Drawer sides (§12.3)', () => {
  const cases: [DrawerSide, 'ltr' | 'rtl', string][] = [
    ['end', 'ltr', 'right'],
    ['start', 'ltr', 'left'],
    ['end', 'rtl', 'left'],
    ['start', 'rtl', 'right'],
    ['bottom', 'ltr', 'bottom'],
  ];
  for (const [side, dir, physical] of cases) {
    test(`side="${side}" in ${dir} sits at the ${physical} edge, data-side="${physical}"`, async () => {
      document.documentElement.dir = dir;
      try {
        await mount(
          <NizivoConfig locale={dir === 'rtl' ? 'ar-EG' : 'en-US'}>{app(side)}</NizivoConfig>,
        );
        const popup = await openDrawer();
        expect(popup.dataset['side']).toBe(physical);
        expect(get('drawer-positioner').dataset['side']).toBe(physical);
        const rect = popup.getBoundingClientRect();
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        const box = {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
        // Figma's 440 px at the side, or the viewport less a 3rem strip of scrim; the sheet is the
        // full width at the bottom.
        const panel = Math.min(440, width - 48);
        const expected = {
          right: { left: width - panel, right: width, width: panel, height },
          left: { left: 0, right: panel, width: panel, height },
          bottom: { left: 0, right: width, width, bottom: height },
        }[physical];
        expect(box).toMatchObject(expected ?? {});
        expectContract();
      } finally {
        document.documentElement.removeAttribute('dir');
      }
    });
  }

  test('at the end edge, a press on the strip of scrim beside it closes it', async () => {
    await mount(app('end'));
    await openDrawer();
    await userEvent.click(get('drawer-backdrop'), { force: true, position: { x: 8, y: 8 } });
    await until(() => expect(find('drawer-popup')).toBeNull());
  });

  test('enters by sliding in its whole width from the edge; reduced motion only fades', async () => {
    await mount(app('end'));
    await userEvent.click(get('drawer-trigger'));
    await until(() => expect(find('drawer-popup')).not.toBeNull());
    const popup = get('drawer-popup');
    // The slide runs once the start state (data-entering) is gone: from one width to the right.
    await until(() => expect(popup.getAnimations().length).toBeGreaterThan(0));
    const moving = popup
      .getAnimations()
      .find((a) => a instanceof CSSTransition && a.transitionProperty === 'translate');
    expect(moving).toBeDefined();
    await until(() => expect(popup.getAnimations()).toEqual([]), 3000);
    expect(getComputedStyle(popup).translate).toMatch(/^(none|0px)$/);
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('drawer-popup')).toBeNull());

    document.documentElement.dataset['nzMotion'] = 'reduce';
    await settle();
    await userEvent.click(get('drawer-trigger'));
    await until(() => expect(find('drawer-popup')).not.toBeNull());
    const reduced = get('drawer-popup');
    await until(() => expect(reduced.getAnimations().length).toBeGreaterThan(0));
    const properties = reduced
      .getAnimations()
      .map((a) => (a instanceof CSSTransition ? a.transitionProperty : ''));
    expect(properties).toContain('opacity');
    expect(properties).not.toContain('translate');
    expect(getComputedStyle(reduced).translate).toMatch(/^(none|0px)$/);
  });

  test('the body is the only scroller; the header and footer stay put', async () => {
    await mount(
      <Drawer.Root defaultOpen>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Popup>
          <Drawer.Header>
            <Drawer.Title>Long</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div style={{ blockSize: '3000px' }}>Tall</div>
          </Drawer.Body>
          <Drawer.Footer>
            <button type="button">Save</button>
          </Drawer.Footer>
        </Drawer.Popup>
      </Drawer.Root>,
    );
    await until(() => expect(find('drawer-popup')).not.toBeNull());
    const body = get('drawer-body');
    const popup = get('drawer-popup');
    await until(() => expect(popup.getAnimations()).toEqual([]), 3000);
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    const footer = get('drawer-footer').getBoundingClientRect();
    expect(Math.round(footer.bottom)).toBe(Math.round(popup.getBoundingClientRect().bottom));
    expect(locked()).toBe(true);
  });
});

describe('Drawer.Trigger target size (WCAG 2.2 2.5.8)', () => {
  test('a bare one-character trigger is at least 24 x 24 px', async () => {
    await mount(
      <Drawer.Root>
        <Drawer.Trigger>i</Drawer.Trigger>
        <Drawer.Popup aria-label="Info">Info</Drawer.Popup>
      </Drawer.Root>,
    );
    const trigger = get('drawer-trigger');
    expect(trigger.className).toBe('nz-drawer-trigger nz-hit-target');
    const { width, height } = trigger.getBoundingClientRect();
    expect(width).toBeGreaterThanOrEqual(24);
    expect(height).toBeGreaterThanOrEqual(24);
  });
});

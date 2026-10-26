// The overlay conformance cases every overlay adapter of an engine family must pass (ARCHITECTURE.md
// §9.6 case 8, §12.2, §12.5, §13.2). Each component describes itself as an OverlaySubject; the cases
// read only the DOM contract, so a second family's adapters run them unchanged.
import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import {
  expectContract,
  find,
  get,
  hydrate,
  locked,
  mount,
  movePointer,
  outsideVocabulary,
  overlayBand,
  pageStyles,
  paintsOnTop,
  portalNode,
  settle,
  transitionMs,
  until,
  watchAttribute,
  watchTransitions,
} from './harness';

export interface OverlaySubject {
  name: string;
  /** The overlay, closed and uncontrolled unless `defaultOpen`; `container` goes to the popup part. */
  app(options?: { defaultOpen?: boolean; container?: Element | null }): ReactElement;
  /** `data-slot` of the trigger and of the positioned popup. */
  trigger: string;
  popup: string;
  /**
   * The element that draws the focus ring while the trigger has focus, when it is not the trigger
   * itself: a combobox's box, around its input (focusTarget "within").
   */
  ring?: string;
  /** The outermost element the engine portals (a positioner), when it is not the popup itself. */
  portalRoot?: string;
  /** How a pointer user opens it: a press, or hovering the trigger. */
  pointer: 'press' | 'hover';
  /** Keys that open it from a focused trigger; `focus` means keyboard focus alone opens it. */
  keys: readonly string[] | 'focus';
  /** Where focus is once it is open (§12.2 "Focus on open"). */
  focus: 'inside' | 'trigger';
  /** Closes on a press outside (§12.3 Dismiss). */
  outsidePress: boolean;
  /** Owns the one scroll lock while open (§12.2 Scroll lock). */
  scrollLock: boolean;
  /** Enters on the spring pair with `scale: var(--nz-scale-enter)` (§13.3), not only a fade. */
  scales: boolean;
  /** Role and IDREF wiring between the trigger and the open popup (§9.6 case 1). */
  aria(trigger: HTMLElement, popup: HTMLElement): void;
}

/** The element focus sits on, through shadow-free documents. */
function focused(): Element | null {
  return document.activeElement;
}

async function open(subject: OverlaySubject): Promise<HTMLElement> {
  const trigger = get(subject.trigger);
  if (subject.pointer === 'hover') {
    await movePointer((element) => userEvent.hover(element));
    await userEvent.hover(trigger);
  } else await userEvent.click(trigger);
  await until(() => expect(find(subject.popup)).not.toBeNull());
  return get(subject.popup);
}

/** Waits for the popup to finish its exit and leave the DOM. */
async function gone(subject: OverlaySubject): Promise<void> {
  await until(() => expect(find(subject.popup)).toBeNull());
}

async function openFromKeyboard(subject: OverlaySubject, key: string): Promise<HTMLElement> {
  await userEvent.keyboard('{Tab}');
  expect(focused()).toBe(get(subject.trigger));
  if (key !== 'focus') await userEvent.keyboard(key);
  await until(() => expect(find(subject.popup)).not.toBeNull());
  return get(subject.popup);
}

/** The node the engine appended to the portal container. */
function portalRoot(subject: OverlaySubject, popup: HTMLElement): HTMLElement {
  return subject.portalRoot === undefined ? popup : get(subject.portalRoot);
}

const isChromium = server.browser === 'chromium';

/** Elements the engine hid from the page (inert, aria-hidden); it must release every one. */
function hiddenCount(): number {
  return document.querySelectorAll('[inert], [aria-hidden]').length;
}

export function describeOverlay(subject: OverlaySubject): void {
  describe(`${subject.name} overlay conformance`, () => {
    test('closed: no popup in the DOM, and the trigger carries no open state', async () => {
      await mount(subject.app());
      expect(find(subject.popup)).toBeNull();
      expect(get(subject.trigger).hasAttribute('data-open')).toBe(false);
      expectContract();
    });

    test('opens from the pointer with the documented contract, closes on Escape, focus returns', async () => {
      await mount(subject.app());
      const before = pageStyles();
      const popup = await open(subject);
      await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
      const trigger = get(subject.trigger);
      expect(popup.hasAttribute('data-open')).toBe(true);
      expect(trigger.hasAttribute('data-open')).toBe(true);
      subject.aria(trigger, popup);
      expectContract();
      const inside = subject.focus === 'inside';
      await until(() => expect(portalRoot(subject, popup).contains(focused())).toBe(inside));
      await userEvent.keyboard('{Escape}');
      await gone(subject);
      expect(trigger.hasAttribute('data-open')).toBe(false);
      // Focus returns once the exit has finished and the popup has left the DOM; a hover never
      // moved it, and a press on a trigger that keeps focus (a combobox's input) put it there.
      await until(() => expect(focused() === trigger).toBe(inside || subject.pointer === 'press'));
      expect(pageStyles()).toBe(before);
    });

    for (const key of subject.keys === 'focus' ? ['focus'] : subject.keys) {
      test(`opens from the keyboard (${key}) and Escape returns focus to the trigger`, async () => {
        await mount(subject.app());
        const popup = await openFromKeyboard(subject, key);
        const trigger = get(subject.trigger);
        subject.aria(trigger, popup);
        const inside = subject.focus === 'inside';
        await until(() => expect(portalRoot(subject, popup).contains(focused())).toBe(inside));
        await until(() => expect(focused() === trigger).toBe(!inside));
        await userEvent.keyboard('{Escape}');
        await gone(subject);
        await until(() => expect(focused()).toBe(trigger));
      });
    }

    test.runIf(subject.outsidePress)('a press outside closes it', async () => {
      const container = await mount(subject.app());
      const outside = document.createElement('button');
      outside.textContent = 'outside';
      outside.style.cssText = 'position: fixed; inset-block-end: 0; inset-inline-end: 0;';
      container.after(outside);
      await open(subject);
      // A modal engine covers the page (an underlay or inert), so press where the button is
      // without Playwright's actionability wait.
      await userEvent.click(outside, { force: true });
      await gone(subject);
      expect(find(subject.popup)).toBeNull();
    });

    test.runIf(subject.scrollLock)(
      'locks page scroll while open and restores <html> and <body> styles exactly',
      async () => {
        await mount(subject.app());
        const before = pageStyles();
        await open(subject);
        expect(locked()).toBe(true);
        await userEvent.keyboard('{Escape}');
        await gone(subject);
        await settle();
        expect(locked()).toBe(false);
        expect(pageStyles()).toBe(before);
      },
    );

    test.runIf(!subject.scrollLock)('never locks page scroll', async () => {
      await mount(subject.app());
      const before = pageStyles();
      await open(subject);
      expect(locked()).toBe(false);
      await userEvent.keyboard('{Escape}');
      await gone(subject);
      expect(pageStyles()).toBe(before);
    });

    test('portals to <body> by default and into `container` when given (§12.1 L2)', async () => {
      const app = await mount(subject.app());
      const popup = await open(subject);
      expect(app.contains(popup)).toBe(false);
      expect(portalNode(portalRoot(subject, popup)).parentElement).toBe(document.body);
      await userEvent.keyboard('{Escape}');
      await gone(subject);

      document.body.replaceChildren();
      const host = document.createElement('div');
      host.id = 'host';
      document.body.append(host);
      await mount(subject.app({ container: host }));
      const inside = await open(subject);
      expect(host.contains(inside)).toBe(true);
      expect(portalNode(portalRoot(subject, inside), host).parentElement).toBe(host);
    });

    test('sits in the one overlay band and paints above the page (§12.1 L1)', async () => {
      await mount(subject.app());
      const popup = await open(subject);
      await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
      expect(getComputedStyle(portalRoot(subject, popup)).zIndex).toBe(overlayBand());
      await until(() => expect(paintsOnTop(popup)).toBe(true));
    });

    test('enters through data-entering with a running transition, and exits through data-exiting before it unmounts', async () => {
      await mount(subject.app());
      const entering = watchAttribute('data-entering');
      const transitions = watchTransitions();
      const popup = await open(subject);
      entering.stop();
      expect(entering.seen).toContain(subject.popup);
      // the fade from data-entering's styles, recorded as it starts: under load it can end before
      // a poll of getAnimations() runs
      await until(() => expect(transitions.seen).toContain(`${subject.popup} opacity`));
      transitions.stop();
      await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
      await until(() => expect(popup.getAnimations()).toEqual([]), 3000);
      expect(getComputedStyle(popup).opacity).toBe('1');
      // Exit: the node stays mounted with data-exiting until its fade ends (§12.2 Motion, §13.2 rule 4).
      const exiting = watchAttribute('data-exiting');
      await userEvent.keyboard('{Escape}');
      await until(() => expect(exiting.seen).toContain(subject.popup));
      expect(outsideVocabulary()).toEqual([]);
      await gone(subject);
      exiting.stop();
    });

    test('reduced motion: no travel, and every fade still runs within 160 ms (§13.2 rule 3)', async () => {
      document.documentElement.dataset['nzMotion'] = 'reduce';
      await mount(subject.app());
      const popup = await open(subject);
      await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
      const durations = transitionMs(popup);
      expect(durations['opacity']).toBeGreaterThan(0);
      for (const ms of Object.values(durations)) expect(ms).toBeLessThanOrEqual(160);
      expect(getComputedStyle(popup).scale).toMatch(/^(none|1)$/);
      expect(getComputedStyle(popup).translate).toMatch(/^(none|0px)$/);
      // The entry scale token is 1, so a popup that scales in does not travel.
      const scale = getComputedStyle(document.documentElement).getPropertyValue('--nz-scale-enter');
      expect(scale.trim()).toBe('1');
    });

    test.runIf(subject.scales)(
      'enters on the spring pair from --nz-scale-enter (§13.3)',
      async () => {
        await mount(subject.app());
        const popup = await open(subject);
        const durations = transitionMs(popup);
        const spring = getComputedStyle(document.documentElement)
          .getPropertyValue('--nz-duration-spring')
          .trim();
        expect(durations['scale']).toBe(Number.parseFloat(spring));
        expect(getComputedStyle(popup).transitionTimingFunction).toContain('linear(');
      },
    );

    test('SSR: a server-rendered defaultOpen hydrates without warnings, then opens', async () => {
      const { html, problems } = await hydrate(subject.app({ defaultOpen: true }));
      expect(html).not.toContain(`data-slot="${subject.popup}"`);
      expect(problems).toEqual([]);
      await until(() => expect(find(subject.popup)).not.toBeNull());
      expectContract();
    });

    test.runIf(subject.focus === 'inside')(
      'SSR: a defaultOpen popup returns focus to its trigger on Escape, not to <body> (§12.2 Focus return)',
      async () => {
        await hydrate(subject.app({ defaultOpen: true }));
        await until(() => expect(find(subject.popup)).not.toBeNull());
        // It opened with focus on <body>: no trigger press gave the engine somewhere to return to.
        await until(() => expect(get(subject.popup).contains(focused())).toBe(true));
        await userEvent.keyboard('{Escape}');
        await gone(subject);
        await until(() => expect(focused()).toBe(get(subject.trigger)));
      },
    );

    test('Strict Mode: 10 open/close cycles leave no lock, no inert node and no popup (O-10)', async () => {
      await mount(subject.app(), { strict: true });
      const before = pageStyles();
      const hiddenBefore = hiddenCount();
      for (let cycle = 0; cycle < 10; cycle += 1) {
        // Sequential on purpose: each cycle opens and closes before the next.
        // oxlint-disable-next-line no-await-in-loop
        await open(subject);
        // oxlint-disable-next-line no-await-in-loop
        await userEvent.keyboard('{Escape}');
        // oxlint-disable-next-line no-await-in-loop
        await gone(subject);
      }
      await settle();
      expect(locked()).toBe(false);
      expect(pageStyles()).toBe(before);
      expect(hiddenCount()).toBe(hiddenBefore);
    });

    test.runIf(isChromium)(
      'forced colours: the popup edge and the focus ring stay visible (O-21)',
      async () => {
        const session = cdp();
        await session.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'forced-colors', value: 'active' }],
        });
        try {
          await mount(subject.app());
          await userEvent.keyboard('{Tab}');
          const ring = get(subject.ring ?? subject.trigger);
          expect(getComputedStyle(ring).outlineStyle).toBe('solid');
          const popup = await open(subject);
          await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
          const edge = getComputedStyle(popup);
          expect(edge.borderTopStyle).toBe('solid');
          expect(Number.parseFloat(edge.borderTopWidth)).toBeGreaterThanOrEqual(1);
        } finally {
          await session.send('Emulation.setEmulatedMedia', { features: [] });
        }
      },
    );
  });
}

// Dialog against the react-aria family's overlay conformance (ARCHITECTURE.md §10.4, §12.3 Dialog row).
import { describe, expect, test } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import { CloseGlyph } from '../../src/_internal/glyphs';
import { Button } from '../../src/button/index';
import { Dialog } from '../../src/dialog/index';
import { IconButton } from '../../src/icon-button/index';
import { describeOverlay } from './conformance';
import { expectContract, find, get, mount, until } from './harness';

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

  // Week 6 review: week 5's `outline: none` was on .nz-dialog-popup, which never takes focus.
  test('the dialog element that holds focus itself shows no ring, opened from the keyboard', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Terms</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Terms</Dialog.Title>
          <Dialog.Body>Long text.</Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    get('dialog-trigger').focus();
    await userEvent.keyboard('{Enter}');
    await until(() => expect(document.activeElement).toBe(get('dialog-content')));
    // Chromium and WebKit treat focus moved by script after a key as keyboard focus; Firefox does
    // not, and then no ring would show anyway.
    expect(server.browser === 'firefox' || get('dialog-content').matches(':focus-visible')).toBe(
      true,
    );
    expect(getComputedStyle(get('dialog-content')).outlineStyle).toBe('none');
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('dialog-popup')).toBeNull());
  });
});

/** `rem` in px at the document's root font size. */
function px(rem: number): number {
  return rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/** The box the focus outline covers: the border box grown by the offset and the width. */
function ringBox(element: HTMLElement): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const style = getComputedStyle(element);
  const grow = Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth);
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top - grow,
    right: rect.right + grow,
    bottom: rect.bottom + grow,
    left: rect.left - grow,
  };
}

describe('Dialog.Close (§12.3, §14.2)', () => {
  test('defaults to a tertiary IconButton with the core close glyph, named "Close", in the top-end corner', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Rename</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>
            Rename collection, a title long enough to reach the close button
          </Dialog.Title>
          <Dialog.Close />
          <Dialog.Body>Body</Dialog.Body>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    // Measured once the spring entry (a scale from --nz-scale-enter) has settled.
    await until(() => expect(get('dialog-popup').getAnimations()).toEqual([]), 3000);
    const close = get('dialog-close');
    expect(close.localName).toBe('button');
    expect(close.getAttribute('type')).toBe('button');
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.classList.contains('nz-dialog-close')).toBe(true);
    expect(close.classList.contains('nz-icon-button')).toBe(true);
    expect(close.dataset['variant']).toBe('tertiary');
    expect(close.querySelector('svg.nz-glyph-close')?.getAttribute('aria-hidden')).toBe('true');
    expectContract();
    // Figma's header close: the 20 px glyph 20 px from the top and end edges of the popup.
    const popup = get('dialog-popup').getBoundingClientRect();
    const glyph = close.querySelector('svg')?.getBoundingClientRect();
    if (glyph === undefined) throw new Error('no glyph');
    expect(glyph.top - popup.top).toBeCloseTo(px(1.25), 0);
    expect(popup.right - glyph.right).toBeCloseTo(px(1.25), 0);
    expect(glyph.width).toBeCloseTo(px(1.25), 0);
    // The title wraps before the close: 12 px apart.
    const title = get('dialog-title');
    const text = document.createRange();
    text.selectNodeContents(title);
    expect(
      close.getBoundingClientRect().left - text.getBoundingClientRect().right,
    ).toBeGreaterThanOrEqual(px(0.75 - (2.5 - 1.25) / 2) - 1);
    // Figma draws it in icon/secondary, not the IconButton's text/primary.
    const probe = document.createElement('span');
    probe.style.color = 'var(--nz-icon-secondary)';
    document.body.append(probe);
    expect(getComputedStyle(close).color).toBe(getComputedStyle(probe).color);
    probe.remove();
    await userEvent.click(close);
    await until(() => expect(find('dialog-popup')).toBeNull());
  });

  test('the default Close is the IconButton element written out: same classes, attributes and glyph', async () => {
    await mount(
      <>
        <IconButton label="Close" icon={<CloseGlyph />} variant="tertiary" tooltip={false} />
        <Dialog.Root defaultOpen>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Same markup</Dialog.Title>
            <Dialog.Close />
          </Dialog.Popup>
        </Dialog.Root>
      </>,
    );
    await until(() => expect(find('dialog-close')).not.toBeNull());
    const reference = get('icon-button');
    const close = get('dialog-close');
    for (const name of ['type', 'aria-label', 'data-variant', 'data-size']) {
      expect(close.getAttribute(name)).toBe(reference.getAttribute(name));
    }
    for (const name of reference.classList) expect(close.classList).toContain(name);
    expect(close.innerHTML).toBe(reference.innerHTML);
  });

  test('labels.close and aria-label rename it; children and render keep the escape hatches', async () => {
    await mount(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Names</Dialog.Title>
          <Dialog.Close labels={{ close: 'Schließen' }} />
          <Dialog.Footer>
            <Dialog.Close aria-label="Dismiss the editor" />
            <Dialog.Close>Done</Dialog.Close>
            <Dialog.Close render={<button type="button">Cancel</button>} />
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await until(() => expect(find('dialog-popup')).not.toBeNull());
    const [renamed, labelled, done, cancel] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="dialog-close"]'),
    ];
    expect(renamed?.getAttribute('aria-label')).toBe('Schließen');
    expect(labelled?.getAttribute('aria-label')).toBe('Dismiss the editor');
    // A Close inside the footer is not moved to the corner.
    if (labelled === undefined) throw new Error('no close in the footer');
    expect(getComputedStyle(labelled).position).not.toBe('absolute');
    for (const custom of [done, cancel]) {
      expect(custom?.classList.contains('nz-icon-button')).toBe(false);
      expect(custom?.querySelector('svg')).toBeNull();
    }
    expect(done?.textContent).toBe('Done');
    expect(cancel?.textContent).toBe('Cancel');
    expectContract();
  });

  test('an alertdialog focuses the Cancel in its footer, not the close in the corner', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Delete</Dialog.Trigger>
        <Dialog.Popup role="alertdialog">
          <Dialog.Title>Delete product?</Dialog.Title>
          <Dialog.Close />
          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
            <button type="button">Delete</button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    await until(() => expect(document.activeElement?.textContent).toBe('Cancel'));
  });

  test('a Close flush with the popup edge shows its whole ring; the corner Close is outside the clip', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Flush</Dialog.Title>
          <Dialog.Close />
          <Dialog.Body>Body</Dialog.Body>
          <Dialog.Close render={<button type="button">Flush close</button>} />
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('dialog-popup')?.hasAttribute('data-entering')).toBe(false));
    await until(() => expect(get('dialog-popup').getAnimations()).toEqual([]), 3000);
    const content = get('dialog-content');
    // The content clips (Figma clips the Modal at its radius), so a flush ring must fall inside it.
    expect(getComputedStyle(content).overflow).toBe('clip');
    const [corner, flush] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="dialog-close"]'),
    ];
    if (corner === undefined || flush === undefined) throw new Error('no close');
    const edge = content.getBoundingClientRect();
    expect(Math.round(flush.getBoundingClientRect().left)).toBe(Math.round(edge.left));
    for (const close of [corner, flush]) {
      // Sequential on purpose: Tab moves through the closes in order.
      // oxlint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Tab}');
      // oxlint-disable-next-line no-await-in-loop
      await until(() => expect(document.activeElement).toBe(close));
      expect(getComputedStyle(close).outlineStyle).toBe('solid');
    }
    // The flush one: an inset ring, wholly inside the clip.
    flush.focus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await userEvent.keyboard('{Tab}');
    await until(() => expect(document.activeElement).toBe(flush));
    const ring = ringBox(flush);
    expect(ring.left).toBeGreaterThanOrEqual(edge.left);
    expect(ring.right).toBeLessThanOrEqual(edge.right);
    expect(ring.bottom).toBeLessThanOrEqual(edge.bottom);
    // The corner one: positioned against the popup, which clips nothing, so its outside ring and
    // halo are never cut (the content's clip does not apply to it).
    expect(getComputedStyle(corner).position).toBe('absolute');
    expect(corner.offsetParent).toBe(get('dialog-popup'));
    expect(getComputedStyle(get('dialog-popup')).overflow).toBe('visible');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await until(() => expect(document.activeElement).toBe(corner));
    expect(Number.parseFloat(getComputedStyle(corner).outlineOffset)).toBeGreaterThan(0);
  });

  test('with the corner Close, a long Body still scrolls inside the popup and the footer stays at its bottom', async () => {
    await mount(
      <Dialog.Root>
        <Dialog.Trigger>Terms</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Terms</Dialog.Title>
          <Dialog.Close />
          <Dialog.Body>
            {Array.from({ length: 80 }, (_, index) => (
              <p key={index}>Clause {index + 1}</p>
            ))}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>Accept</Dialog.Close>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await openDialog();
    await until(() => expect(get('dialog-popup').getAnimations()).toEqual([]), 3000);
    const popup = get('dialog-popup').getBoundingClientRect();
    const body = get('dialog-body');
    expect(popup.bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(Math.round(get('dialog-footer').getBoundingClientRect().bottom)).toBe(
      Math.round(popup.bottom),
    );
    // The corner Close stays put while the Body scrolls.
    const close = get('dialog-close').getBoundingClientRect().top;
    body.scrollTop = body.scrollHeight;
    expect(get('dialog-close').getBoundingClientRect().top).toBe(close);
  });
});

// M27: a bare Dialog.Trigger is its own <button>, so it gets a minimum target of its own (WCAG 2.2
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
  return [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-trigger"]')];
}

describe('Dialog.Trigger target size (WCAG 2.2 2.5.8)', () => {
  test('a bare text trigger and a bare icon-only trigger are at least 24 x 24 px, side by side', async () => {
    await mount(
      <div style={{ display: 'flex' }}>
        {['?', 'Edit'].map((text) => (
          <Dialog.Root key={text}>
            <Dialog.Trigger>{text}</Dialog.Trigger>
            <Dialog.Popup>
              <Dialog.Title>{text}</Dialog.Title>
            </Dialog.Popup>
          </Dialog.Root>
        ))}
        <Dialog.Root>
          <Dialog.Trigger aria-label="Settings">{Glyph}</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Settings</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
      </div>,
    );
    const bare = triggers();
    expect(bare).toHaveLength(3);
    for (const trigger of bare) {
      expect(trigger.className).toBe('nz-dialog-trigger nz-hit-target');
      const { width, height } = size(trigger);
      expect(width).toBeGreaterThanOrEqual(24);
      expect(height).toBeGreaterThanOrEqual(24);
    }
  });

  test('a composed Button or IconButton keeps its own size and classes', async () => {
    await mount(
      <>
        <Button variant="secondary">Edit</Button>
        <IconButton label="Settings" icon={Glyph} variant="tertiary" size="sm" tooltip={false} />
        <Dialog.Root>
          <Dialog.Trigger render={<Button variant="secondary">Edit</Button>} />
          <Dialog.Popup>
            <Dialog.Title>Edit</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
        <Dialog.Root>
          <Dialog.Trigger
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
          <Dialog.Popup>
            <Dialog.Title>Settings</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
      </>,
    );
    const [button, iconButton] = triggers();
    if (button === undefined || iconButton === undefined) throw new Error('no trigger');
    expect(button.className).toBe('nz-button nz-hit-target nz-dialog-trigger');
    expect(iconButton.className).toBe('nz-icon-button nz-hit-target nz-dialog-trigger');
    expectSameSize(button, get('button'));
    expectSameSize(iconButton, get('icon-button'));
  });

  test("a consumer's own element through render gets no minimum and no hit area", async () => {
    const container = await mount(
      <div>
        <button type="button" className="mine">
          ?
        </button>
        <Dialog.Root>
          <Dialog.Trigger
            render={
              <button type="button" className="mine">
                ?
              </button>
            }
          />
          <Dialog.Popup>
            <Dialog.Title>Help</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Root>
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
      <Dialog.Root>
        <Dialog.Trigger aria-label="Settings">{Glyph}</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Settings</Dialog.Title>
        </Dialog.Popup>
      </Dialog.Root>,
    );
    await userEvent.keyboard('{Tab}');
    const trigger = get('dialog-trigger');
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

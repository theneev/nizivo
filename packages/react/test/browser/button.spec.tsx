// The pending Button and IconButton under each motion mode (ARCHITECTURE.md §13.2; M34, Figma
// Accessibility "Spinner and skeleton loops stop; a text label shows"). Reduced motion is the
// `[data-nz-motion="reduce"]` switch here; `prefers-reduced-motion` runs the same declarations. The
// spinner reads --nz-duration-spin, which Figma's Reduced mode sets to 0 ms; the Reduced cases set it on
// the wrapper as well, so they test the component's CSS whatever value the built tokens carry.
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { cdp, server } from 'vitest/browser';
import { Button } from '../../src/button/button';
import { IconButton } from '../../src/icon-button/icon-button';
import { IconButtonStatic } from '../../src/icon-button/icon-button-static';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../src/button/button.css',
    '../../src/icon-button/icon-button.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 3)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const Mark = (
  <svg viewBox="0 0 24 24" width="1em" height="1em">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

/** Reduced motion as the app switches it, with the token value Figma's Reduced mode gives the spin. */
function Reduced({ children }: { children: ReactNode }): ReactNode {
  return (
    <div data-nz-motion="reduce" style={{ '--nz-duration-spin': '0ms' } as Record<string, string>}>
      {children}
    </div>
  );
}

function spinner(container: HTMLElement): SVGElement {
  const glyph = container.querySelector<SVGElement>('.nz-glyph-spinner');
  if (glyph === null) throw new Error('no spinner');
  return glyph;
}

function labelOf(button: HTMLElement): HTMLElement {
  const label = button.querySelector<HTMLElement>('[data-slot="button-label"]');
  if (label === null) throw new Error('no label');
  return label;
}

function pendingLabel(container: HTMLElement): HTMLElement {
  const label = container.querySelector<HTMLElement>('[data-slot="button-pending-label"]');
  if (label === null) throw new Error('no pending label');
  return label;
}

describe('Button pending', () => {
  test('default motion: the spinner turns on --nz-duration-spin and the loading text is hidden', async () => {
    const container = await mount(<Button pending>Publish</Button>);
    const glyph = spinner(container);
    expect(getComputedStyle(glyph).animationName).toBe('nz-button-spin');
    const probe = document.createElement('i');
    probe.style.transitionDuration = 'var(--nz-duration-spin)';
    document.body.append(probe);
    expect(getComputedStyle(glyph).animationDuration).toBe(
      getComputedStyle(probe).transitionDuration,
    );
    expect(glyph.getAnimations().map((animation) => animation.playState)).toEqual(['running']);
    expect(getComputedStyle(pendingLabel(container)).display).toBe('none');
  });

  test('Reduced motion: the spinner rests upright and "Loading…" shows after the label', async () => {
    const container = await mount(
      <Reduced>
        <Button pending>Publish</Button>
      </Reduced>,
    );
    const glyph = spinner(container);
    await settle(100);
    expect(getComputedStyle(glyph).rotate).toBe('none');
    expect(glyph.getAnimations().filter((a) => a.playState === 'running')).toEqual([]);
    const text = pendingLabel(container);
    // a flex item, so its `display: inline` computes to block
    expect(getComputedStyle(text).display).toBe('block');
    expect(text.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(text.textContent).toBe('Loading…');
    // after the label, on the same line, inside the 40 px button
    const button = container.querySelector('button');
    const label = container.querySelector('[data-slot="button-label"]');
    if (button === null || label === null) throw new Error('no button');
    expect(text.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      label.getBoundingClientRect().right,
    );
    expect(button.getBoundingClientRect().height).toBe(40);
    expect(text.getBoundingClientRect().right).toBeLessThan(button.getBoundingClientRect().right);
    // the label is still shown: Figma's Button "keep the label"
    expect(getComputedStyle(label).display).not.toBe('none');
  });

  test.each([
    // a 320 px phone with 16 px gutters, and a narrow card column
    { width: 288, size: 'lg', text: 'Save and continue to payment' },
    { width: 160, size: 'md', text: 'Save and continue' },
  ] as const)(
    'Reduced motion in a $width px button that cannot grow: the text gives way, the label keeps its lines',
    async ({ width, size, text }) => {
      const container = await mount(
        <div style={{ inlineSize: width }}>
          <Button fullWidth size={size} variant="primary" leadingIcon={Mark}>
            {text}
          </Button>
          <Reduced>
            <Button pending fullWidth size={size} variant="primary">
              {text}
            </Button>
          </Reduced>
        </div>,
      );
      const [plain, pending] = [...container.querySelectorAll('button')];
      if (plain === undefined || pending === undefined) throw new Error('no buttons');
      const box = pending.getBoundingClientRect();
      const label = labelOf(pending).getBoundingClientRect();
      // no more lines than the same button not pending (its icon in the spinner's place), and inside
      expect(label.height).toBeLessThanOrEqual(labelOf(plain).getBoundingClientRect().height);
      expect(label.height).toBeLessThanOrEqual(box.height);
      // two 20 px lines fill a 40 px button: WebKit lays them a fraction of a pixel over
      expect(label.top).toBeGreaterThan(box.top - 1);
      expect(label.bottom).toBeLessThan(box.bottom + 1);
      expect(pendingLabel(pending).getBoundingClientRect().right).toBeLessThanOrEqual(box.right);
      expect(box.width).toBe(width);
    },
  );

  test('Reduced motion at free width: the whole text shows, centred with the label', async () => {
    const container = await mount(
      <div style={{ inlineSize: 600 }}>
        <Reduced>
          <Button pending fullWidth>
            Publish
          </Button>
        </Reduced>
      </div>,
    );
    const button = container.querySelector('button');
    if (button === null) throw new Error('no button');
    const text = pendingLabel(container);
    expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
    const box = button.getBoundingClientRect();
    const icon = button.querySelector('[data-slot="button-icon"]')?.getBoundingClientRect();
    if (icon === undefined) throw new Error('no icon');
    const right = box.right - text.getBoundingClientRect().right;
    expect(Math.abs(icon.left - box.left - right)).toBeLessThan(2);
  });

  test('labels.pending empty: no text and no lone separator', async () => {
    const container = await mount(
      <Reduced>
        <Button pending labels={{ pending: '' }}>
          Empty
        </Button>
      </Reduced>,
    );
    expect(container.querySelector('[data-slot="button-pending-label"]')).toBeNull();
  });

  test('a pending Button with no label: the text shows without a leading separator', async () => {
    const container = await mount(
      <Reduced>
        <Button pending aria-label="Save" />
      </Reduced>,
    );
    expect(getComputedStyle(pendingLabel(container), '::before').content).toBe('none');
  });

  test.runIf(server.browser === 'chromium')(
    'prefers-reduced-motion with the built tokens: the spinner stops and the text shows',
    async () => {
      const session = cdp();
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      try {
        expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
        const container = await mount(<Button pending>Publish</Button>);
        await settle(100);
        const glyph = spinner(container);
        expect(getComputedStyle(glyph).animationDuration).toBe('0s');
        expect(glyph.getAnimations().filter((a) => a.playState === 'running')).toEqual([]);
        const text = pendingLabel(container);
        expect(getComputedStyle(text).display).toBe('block');
        expect(text.getBoundingClientRect().width).toBeGreaterThan(0);
      } finally {
        await session.send('Emulation.setEmulatedMedia', { features: [] });
      }
    },
  );

  test('Reduced motion with no pending: nothing changes', async () => {
    const container = await mount(
      <Reduced>
        <Button>Publish</Button>
      </Reduced>,
    );
    expect(container.querySelector('.nz-glyph-spinner')).toBeNull();
    expect(container.querySelector('[data-slot="button-pending-label"]')).toBeNull();
  });
});

describe('IconButton pending', () => {
  test('default motion: the spinner turns', async () => {
    const container = await mount(
      <IconButton label="Delete" icon={Mark} pending tooltip={false} />,
    );
    const glyph = spinner(container);
    expect(getComputedStyle(glyph).animationName).toBe('nz-icon-button-spin');
    expect(glyph.getAnimations().map((animation) => animation.playState)).toEqual(['running']);
  });

  test('Reduced motion: the spinner rests upright, on both IconButton and IconButtonStatic', async () => {
    const container = await mount(
      <Reduced>
        <IconButton label="Delete" icon={Mark} pending tooltip={false} />
        <IconButtonStatic aria-label="Delete" icon={Mark} pending />
      </Reduced>,
    );
    await settle(100);
    const glyphs = [...container.querySelectorAll<SVGElement>('.nz-glyph-spinner')];
    expect(glyphs).toHaveLength(2);
    for (const glyph of glyphs) {
      expect(getComputedStyle(glyph).rotate).toBe('none');
      expect(glyph.getAnimations().filter((a) => a.playState === 'running')).toEqual([]);
    }
    // still square: an icon-only button has no room for text
    for (const button of container.querySelectorAll('button')) {
      const rect = button.getBoundingClientRect();
      expect([rect.width, rect.height]).toEqual([40, 40]);
    }
  });
});

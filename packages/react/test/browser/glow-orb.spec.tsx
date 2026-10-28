// GlowOrb in a browser (M89, D-du): the server HTML is the poster and hydrates unchanged; WebGL draws
// a first frame, then the canvas covers the poster at the box's size × the pixel ratio (at most 2);
// without WebGL the poster stays; the level function is read each frame while the orb is on screen,
// not while it is off screen or after it unmounts; under reduced motion it draws only when its input
// changes; and in VoiceOrb's and AiWelcome's slots it replaces their own halo.
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GlowOrb } from '../../src/unstable/glow-orb/glow-orb.client';
import { AiWelcome } from '../../src/unstable/ai-welcome/ai-welcome';
import { VoiceOrb } from '../../src/unstable/voice-orb/voice-orb';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/icon-button/icon-button.css',
    '../../src/unstable/voice-orb/voice-orb.css',
    '../../src/unstable/ai-welcome/ai-welcome.css',
    '../../src/unstable/glow-orb/glow-orb.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 6)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-nz-motion');
  vi.restoreAllMocks();
});

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Whether this engine gives a page WebGL at all (headless engines may not). */
const webgl = document.createElement('canvas').getContext('webgl') !== null;

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await wait(100);
  return container;
}

const poster = (root: ParentNode = document): HTMLElement => {
  const el = root.querySelector<HTMLElement>('.nz-glow-orb-poster');
  if (el === null) throw new Error('no poster');
  return el;
};

const canvas = (root: ParentNode = document): HTMLCanvasElement => {
  const el = root.querySelector('canvas.nz-glow-orb-canvas');
  if (!(el instanceof HTMLCanvasElement)) throw new Error('no canvas');
  return el;
};

function Box({ children, size = 160 }: { children: ReactNode; size?: number }): ReactNode {
  return <div style={{ inlineSize: size, blockSize: size }}>{children}</div>;
}

describe('GlowOrb', () => {
  test('the server HTML is the poster, and hydrates with no change and no warning', async () => {
    const app = (
      <Box>
        <GlowOrb state="listening" />
      </Box>
    );
    const html = renderToString(app);
    expect(html).toContain('class="nz-glow-orb"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('hidden=""');
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const problems: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
    roots.push(hydrateRoot(container, app, { onRecoverableError: (e) => problems.push(e) }));
    await wait(100);
    expect(problems).toEqual([]);
  });

  test.runIf(webgl)(
    'WebGL draws, then the canvas covers the poster at the box size × the pixel ratio (at most 2)',
    async () => {
      const container = await mount(
        <Box>
          <GlowOrb />
        </Box>,
      );
      await vi.waitFor(() => expect(poster(container).hidden).toBe(true));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      expect(canvas(container).width).toBe(Math.round(160 * ratio));
      expect(canvas(container).height).toBe(Math.round(160 * ratio));
    },
  );

  test('without WebGL the poster stays, with no error', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const errors: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => errors.push(args));
    const container = await mount(
      <Box>
        <GlowOrb state="speaking" />
      </Box>,
    );
    await wait(200);
    expect(poster(container).hidden).toBe(false);
    expect(errors).toEqual([]);
  });

  test.runIf(webgl)(
    'the level is read each frame on screen, not off screen, and not after unmount',
    async () => {
      const level = vi.fn<() => number>(() => 0.5);
      await mount(
        <Box>
          <GlowOrb state="speaking" level={level} />
        </Box>,
      );
      await wait(400);
      expect(level.mock.calls.length).toBeGreaterThan(5);

      // off screen: the loop stops
      level.mockClear();
      await mount(
        <div style={{ marginBlockStart: 4000 }}>
          <Box>
            <GlowOrb state="speaking" level={level} />
          </Box>
        </div>,
      );
      roots.shift()?.unmount();
      level.mockClear();
      await wait(400);
      expect(level.mock.calls.length).toBeLessThanOrEqual(1);

      roots.shift()?.unmount();
      level.mockClear();
      await wait(300);
      expect(level).not.toHaveBeenCalled();
    },
  );

  test.runIf(webgl)(
    'reduced motion: one still frame, drawn again only when the input changes',
    async () => {
      document.documentElement.dataset['nzMotion'] = 'reduce';
      const level = vi.fn<() => number>(() => 0.2);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      roots.push(root);
      root.render(
        <Box>
          <GlowOrb state="speaking" level={level} />
        </Box>,
      );
      await vi.waitFor(() => expect(poster(container).hidden).toBe(true));
      level.mockClear();
      await wait(400);
      expect(level).not.toHaveBeenCalled();
      root.render(
        <Box>
          <GlowOrb state="idle" level={level} />
        </Box>,
      );
      await wait(100);
      expect(level.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(level.mock.calls.length).toBeLessThanOrEqual(3);
    },
  );

  test("in VoiceOrb's orb slot it fills the 160 px orb, and VoiceOrb draws no halo of its own", async () => {
    const container = await mount(
      <VoiceOrb state="listening" orb={<GlowOrb state="listening" />} />,
    );
    const orb = container.querySelector<HTMLElement>('[data-slot="voice-orb-orb"]');
    const glow = container.querySelector<HTMLElement>('[data-slot="glow-orb"]');
    if (orb === null || glow === null) throw new Error('no orb');
    expect(getComputedStyle(orb).backgroundImage).toBe('none');
    expect(glow.getBoundingClientRect().width).toBe(160);
    expect(glow.getBoundingClientRect().height).toBe(160);
  });

  test("in AiWelcome's orb slot it fills the 72 px orb, and AiWelcome draws no halo of its own", async () => {
    const container = await mount(<AiWelcome greeting="Good morning" orb={<GlowOrb />} />);
    const orb = container.querySelector<HTMLElement>('.nz-ai-welcome-orb');
    const glow = container.querySelector<HTMLElement>('[data-slot="glow-orb"]');
    if (orb === null || glow === null) throw new Error('no orb');
    expect(getComputedStyle(orb).backgroundImage).toBe('none');
    expect(glow.getBoundingClientRect().width).toBe(72);
    expect(glow.getBoundingClientRect().height).toBe(72);
  });
});

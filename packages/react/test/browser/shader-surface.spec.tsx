// ShaderSurface in a browser (M89, D-dv): the server HTML is the poster and hydrates unchanged;
// WebGL draws, then the canvas covers the poster at the box's size × the pixel ratio (at most 2);
// without WebGL the poster stays; `aurora-dark` resolves its tokens in the dark scheme on a light
// page; and in CtaBand's, BentoTile's and ProfileCard's slots it replaces their CSS stand-ins, with a
// scrim behind CtaBand's text. The loop's pausing is the shared runtime's, checked in glow-orb.spec.
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BentoTile } from '../../src/unstable/bento-tile/bento-tile';
import { CtaBand } from '../../src/unstable/cta-band/cta-band';
import { ProfileCard } from '../../src/unstable/profile-card/profile-card';
import { ShaderSurface } from '../../src/unstable/shader-surface/shader-surface.client';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/unstable/cta-band/cta-band.css',
    '../../src/unstable/bento-tile/bento-tile.css',
    '../../src/unstable/profile-card/profile-card.css',
    '../../src/unstable/shader-surface/shader-surface.css',
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

const one = (root: ParentNode, selector: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(selector);
  if (el === null) throw new Error(`no ${selector}`);
  return el;
};

/** A surface's ground colour: the logical border colour its shader reads. */
const ground = (el: Element): string =>
  getComputedStyle(el).getPropertyValue('border-block-start-color');

function Box({ children }: { children: ReactNode }): ReactNode {
  return <div style={{ inlineSize: 480, blockSize: 300 }}>{children}</div>;
}

describe('ShaderSurface', () => {
  test('the server HTML is the poster, and hydrates with no change and no warning', async () => {
    const app = (
      <Box>
        <ShaderSurface />
      </Box>
    );
    const html = renderToString(app);
    expect(html).toContain('data-variant="aurora"');
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
          <ShaderSurface />
        </Box>,
      );
      await vi.waitFor(() => expect(one(container, '.nz-shader-surface-poster').hidden).toBe(true));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = one(container, 'canvas');
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('no canvas');
      expect(canvas.width).toBe(Math.round(480 * ratio));
      expect(canvas.height).toBe(Math.round(300 * ratio));
    },
  );

  test('without WebGL the poster stays, with no error', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const errors: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => errors.push(args));
    const container = await mount(
      <Box>
        <ShaderSurface />
      </Box>,
    );
    await wait(200);
    expect(one(container, '.nz-shader-surface-poster').hidden).toBe(false);
    expect(errors).toEqual([]);
  });

  test('aurora-dark resolves its tokens in the dark scheme on a light page', async () => {
    const container = await mount(
      <>
        <Box>
          <ShaderSurface />
        </Box>
        <Box>
          <ShaderSurface variant="aurora-dark" />
        </Box>
      </>,
    );
    const [light, dark] = [...container.querySelectorAll<HTMLElement>('.nz-shader-surface')];
    if (light === undefined || dark === undefined) throw new Error('no surfaces');
    // the ground: bg/accent-subtle, lime-50 in light and green-950 in dark
    expect(ground(light)).toBe('rgb(246, 250, 232)');
    expect(ground(dark)).toBe('rgb(10, 33, 26)');
  });

  test("in the slots it replaces the stand-ins, with a scrim behind CtaBand's text", async () => {
    const container = await mount(
      <>
        <CtaBand title="Ship it" background={<ShaderSurface variant="aurora-dark" />} />
        <BentoTile title="Themes" background={<ShaderSurface />} />
        <ProfileCard name="Alex Rivera" cover={<ShaderSurface />} />
      </>,
    );
    for (const slot of [
      '.nz-cta-band-background',
      '.nz-bento-tile-background',
      '.nz-profile-card-cover',
    ]) {
      const background = getComputedStyle(one(container, slot)).backgroundImage;
      expect({ slot, background }).toEqual({ slot, background: 'none' });
    }
    const scrim = getComputedStyle(one(container, '.nz-cta-band-background'), '::after');
    expect(scrim.backgroundImage).toContain('radial-gradient');
  });
});

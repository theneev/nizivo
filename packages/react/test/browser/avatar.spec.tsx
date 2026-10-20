// Avatar and AvatarGroup in a real engine (Figma 7370:21, 7370:26): the server HTML only, as an RSC page
// ships it (0 KB of client JS). Figma's four sizes; the no-script fallback, by pixels: a photo that
// fails to load shows the same pixels as the initials-only avatar, a photo that loads covers them; no
// tab stop; the group's 8 px overlap and 2 px ring; the edge in forced colours (Chromium). The broken
// photo: Firefox and Chromium show the initials (Chromium's broken-image mark sits in the clipped
// top-left corner, away from the sampled points); WebKit draws its "?" mark over the middle, as
// avatar.tsx documents, so there only the edges are compared.
//
// Every engine: `NZ_BROWSER=webkit` (or `firefox`) runs it too. Forced colours run in Chromium only.
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import { Avatar, AvatarGroup } from '../../src/avatar/avatar';

const STYLES = import.meta.glob(
  ['../../../tokens/dist/tokens.css', '../../styles/base.css', '../../src/avatar/avatar.css'],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 3)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const isChromium = server.browser === 'chromium';
const isWebKit = server.browser === 'webkit';

afterEach(() => {
  document.body.replaceChildren();
});

async function frames(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** The server HTML in a fresh container, as a Server Component page delivers it. */
async function mount(element: ReactElement): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.padding = '8px';
  container.innerHTML = renderToString(element);
  document.body.append(container);
  await frames();
  return container;
}

function one(container: ParentNode, selector: string): HTMLElement {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
}

/** A 2 × 2 solid red PNG, made here so the test needs no file. */
function redPng(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.fillStyle = '#ff0000';
  context.fillRect(0, 0, 2, 2);
  return canvas.toDataURL('image/png');
}

/** Waits until every image in `container` has loaded or failed. */
async function settled(container: ParentNode): Promise<void> {
  await Promise.all(
    [...container.querySelectorAll('img')].map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          }),
    ),
  );
  await frames(100);
}

/** RGBA of the element's pixels at fractions of its box, read from a screenshot. */
async function pixels(element: HTMLElement, points: Array<[number, number]>): Promise<number[][]> {
  const base64 = await page.screenshot({ element, save: false });
  const image = new Image();
  image.src = `data:image/png;base64,${base64}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.drawImage(image, 0, 0);
  return points.map(([x, y]) => [
    ...context.getImageData(Math.floor(x * image.width), Math.floor(y * image.height), 1, 1).data,
  ]);
}

const close = (a: number[], b: number[]): boolean =>
  a.every((value, index) => Math.abs(value - (b[index] ?? 0)) <= 8);

describe('sizes and markup in the engine', () => {
  test.each([
    ['sm', 24],
    ['md', 32],
    ['lg', 40],
    ['xl', 56],
  ] as const)("Figma's %s is %i px, a circle, the initials centred", async (size, px) => {
    const root = await mount(<Avatar name="Maya Rao" size={size} />);
    const avatar = one(root, '.nz-avatar');
    const box = avatar.getBoundingClientRect();
    expect([Math.round(box.width), Math.round(box.height)]).toEqual([px, px]);
    expect(getComputedStyle(avatar).borderTopLeftRadius).not.toBe('0px');
    const text = one(root, '.nz-avatar-initials').getBoundingClientRect();
    expect(Math.abs(text.left + text.width / 2 - (box.left + box.width / 2))).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(text.top + text.height / 2 - (box.top + box.height / 2))).toBeLessThanOrEqual(
      1,
    );
  });

  test('no tab stop: Tab goes from the field before to the field after', async () => {
    const root = await mount(
      <div>
        <input aria-label="Before" data-before="" />
        <Avatar name="Maya Rao" src={redPng()} />
        <AvatarGroup total={5}>
          <Avatar name="Jonah" />
          <Avatar name="Priya" />
        </AvatarGroup>
        <input aria-label="After" data-after="" />
      </div>,
    );
    one(root, '[data-before]').focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(one(root, '[data-after]'));
  });
});

describe('the fallback without script', () => {
  test('a photo that fails shows the initials; one that loads covers them', async () => {
    const root = await mount(
      <div>
        <Avatar name="Maya Rao" size="xl" data-case="initials" />
        <Avatar name="Maya Rao" size="xl" src="/no-such-avatar.png" data-case="broken" />
        <Avatar name="Maya Rao" size="xl" src={redPng()} data-case="photo" />
      </div>,
    );
    await settled(root);
    const broken = one(root, '[data-case="broken"] img');
    if (!(broken instanceof HTMLImageElement)) throw new Error('no img');
    expect(broken.naturalWidth).toBe(0);
    // inside the circle: left of the letters, the letters' centre, right of them, low centre
    const points: Array<[number, number]> = [
      [0.18, 0.5],
      [0.5, 0.5],
      [0.82, 0.5],
      [0.5, 0.8],
    ];
    const initials = await pixels(one(root, '[data-case="initials"]'), points);
    const fallback = await pixels(one(root, '[data-case="broken"]'), points);
    const photo = await pixels(one(root, '[data-case="photo"]'), points);
    // WebKit's "?" mark covers the middle point (the letters' centre); the other three must match
    const compared = [0, 2, 3];
    for (const index of compared) {
      expect(close(fallback[index] ?? [], initials[index] ?? [])).toBe(true);
    }
    // WebKit's mark differs at the centre; elsewhere the centre matches as well
    expect(close(fallback[1] ?? [], initials[1] ?? [])).toBe(!isWebKit);
    for (const pixel of photo) expect(close(pixel, [255, 0, 0, 255])).toBe(true);
  });
});

describe('AvatarGroup', () => {
  test('8 px overlap, a 2 px surface ring, the count at the avatars size', async () => {
    const root = await mount(
      <AvatarGroup total={7}>
        <Avatar name="Maya" />
        <Avatar name="Jonah" />
        <Avatar name="Priya" />
      </AvatarGroup>,
    );
    const items = [...root.querySelectorAll<HTMLElement>('.nz-avatar-group > *')];
    expect(items).toHaveLength(4);
    const boxes = items.map((item) => item.getBoundingClientRect());
    for (const box of boxes) {
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([32, 32]);
    }
    const overlaps = boxes.slice(1).map((next, index) => (boxes[index]?.right ?? 0) - next.left);
    expect(overlaps.map((overlap) => Math.round(overlap))).toEqual([8, 8, 8]);
    expect(getComputedStyle(one(root, '.nz-avatar')).boxShadow).toMatch(/0px 0px 0px 2px/);
    expect(one(root, '.nz-avatar-group-more').textContent).toBe('+4');
  });
});

describe.runIf(isChromium)('forced colours (Chromium)', () => {
  test('every circle keeps an edge in the system palette', async () => {
    const session = cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    try {
      const root = await mount(
        <AvatarGroup total={4}>
          <Avatar name="Maya" />
          <Avatar name="Jonah" />
        </AvatarGroup>,
      );
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
      for (const circle of root.querySelectorAll<HTMLElement>(
        '.nz-avatar, .nz-avatar-group-more',
      )) {
        const css = getComputedStyle(circle);
        expect(css.outlineStyle).toBe('solid');
        expect(css.outlineWidth).toBe('1px');
        expect(css.outlineColor).not.toMatch(/^rgba\(.*, 0\)$|^transparent$/);
      }
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  });
});

// usePointerFx in a browser (ARCHITECTURE.md §13.3; D-dd): a mouse over the element writes where it
// is (-1 to 1) once per frame and motion.css tilts it; leaving puts it back; touch never moves it;
// reduced motion ([data-nz-motion="reduce"]) writes nothing.
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { PointerFx } from '../../src/pointer-fx/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/pointer-fx/pointer-fx.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 3)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-nz-motion');
});

const frame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

async function mount(): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(<PointerFx style={{ inlineSize: 200, blockSize: 100 }}>Card</PointerFx>);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const el = container.querySelector<HTMLElement>('[data-pointer-fx]');
  if (el === null) throw new Error('no element');
  return el;
}

function point(el: HTMLElement, type: string, fx: number, fy: number, pointerType = 'mouse'): void {
  const box = el.getBoundingClientRect();
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerType,
      clientX: box.left + box.width * fx,
      clientY: box.top + box.height * fy,
    }),
  );
}

const fine = (): boolean => matchMedia('(hover: hover) and (pointer: fine)').matches;

describe('tilt', () => {
  test('a mouse at the right edge, top: x 1, y -1, and a rotation', async () => {
    const el = await mount();
    if (!fine()) return; // a lane without a fine pointer has nothing to check
    point(el, 'pointermove', 1, 0);
    await frame();
    expect(el.style.getPropertyValue('--nz-pointer-x')).toBe('1.000');
    expect(el.style.getPropertyValue('--nz-pointer-y')).toBe('-1.000');
    expect(getComputedStyle(el).transform).not.toBe('none');
  });

  test('leaving puts it back to 0', async () => {
    const el = await mount();
    if (!fine()) return;
    point(el, 'pointermove', 0.75, 0.5);
    await frame();
    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await frame();
    expect(el.style.getPropertyValue('--nz-pointer-x')).toBe('0.000');
  });

  test('touch never moves it', async () => {
    const el = await mount();
    point(el, 'pointermove', 1, 1, 'touch');
    await frame();
    expect(el.style.getPropertyValue('--nz-pointer-x')).toBe('');
  });

  test('reduced motion writes nothing', async () => {
    document.documentElement.setAttribute('data-nz-motion', 'reduce');
    const el = await mount();
    point(el, 'pointermove', 1, 1);
    await frame();
    expect(el.style.getPropertyValue('--nz-pointer-x')).toBe('');
  });
});

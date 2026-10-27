// Surface in a browser (ARCHITECTURE.md §13, §21.3; D-dc): solid is opaque bg/surface; glass blurs
// the backdrop behind a translucent bg/surface where backdrop-filter works (every engine in this
// lane), with a shadow; the floor's opaque fallback is the @supports branch not taken.
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { Surface, type SurfaceMaterial } from '../../src/surface/index';

const STYLES = import.meta.glob(
  ['../../../tokens/dist/tokens.css', '../../styles/base.css', '../../src/surface/surface.css'],
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
});

async function mount(material: SurfaceMaterial): Promise<CSSStyleDeclaration> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(<Surface material={material}>Panel</Surface>);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const panel = container.querySelector('[data-slot="surface"]');
  if (panel === null) throw new Error('no surface');
  return getComputedStyle(panel);
}

/** The alpha of a computed colour, in any of the forms engines print. */
function alpha(colour: string): number {
  const match = /\/\s*([\d.]+)\)|rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/.exec(colour);
  if (match === null) return 1;
  return Number(match[1] ?? match[2]);
}

describe('material', () => {
  test('solid: an opaque fill, no blur, no shadow', async () => {
    const computed = await mount('solid');
    expect(alpha(computed.backgroundColor)).toBe(1);
    expect(computed.backdropFilter).toBe('none');
    expect(computed.boxShadow).toBe('none');
  });

  test('glass: a translucent fill over a 24 px blur, with a shadow', async () => {
    const computed = await mount('glass');
    expect(alpha(computed.backgroundColor)).toBeCloseTo(0.72, 2);
    expect(computed.backdropFilter).toBe('blur(24px)');
    expect(computed.boxShadow).not.toBe('none');
  });
});

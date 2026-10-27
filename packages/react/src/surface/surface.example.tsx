import type { JSX } from 'react';
import { Surface } from './index';

/** The default solid panel: bg/surface, a hairline and radius/xl. */
export function SurfaceExample(): JSX.Element {
  return (
    <Surface style={{ maxInlineSize: 320, padding: 20 }}>
      <strong>Store hours</strong>
      <p style={{ margin: '4px 0 0' }}>Mon–Sat, 9:00–18:00</p>
    </Surface>
  );
}

/**
 * Glass over an image: bg/surface at 72 % with the backdrop blurred behind it, as Figma's floating
 * navbar and the Lab's Glass card. Opaque where the backdrop cannot be blurred.
 */
export function SurfaceGlassExample(): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        inlineSize: 360,
        blockSize: 220,
        borderRadius: 16,
        background:
          'radial-gradient(circle at 25% 30%, #4c9e71 0 22%, transparent 23%), radial-gradient(circle at 75% 70%, #c9b79c 0 26%, transparent 27%), linear-gradient(135deg, #1a573a, #8a6e4b)',
      }}
    >
      <Surface material="glass" style={{ inlineSize: 260, padding: 20 }}>
        <strong>New collection</strong>
        <p style={{ margin: '4px 0 0' }}>Stoneware in five glazes, from Friday.</p>
      </Surface>
    </div>
  );
}

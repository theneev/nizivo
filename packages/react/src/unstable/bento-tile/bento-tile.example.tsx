import type { JSX } from 'react';
import { BentoTile } from './index';

/** Figma's three sizes in a 12-column bento grid. */
export function BentoTileExample(): JSX.Element {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, inlineSize: 960 }}
    >
      <BentoTile
        size="wide"
        title="Light and Dark"
        description="One mode switch, every colour follows."
      />
      <BentoTile size="tall" title="Accessible" description="Every pair passes AA." />
      <BentoTile size="square" title="Tokens" description="One set, every surface." />
      <BentoTile size="square" title="Motion" description="Calm by default." />
    </div>
  );
}

import type { JSX } from 'react';
import { SectionHeader } from './index';

/** Figma's two alignments: start for most sections, centre for a short single idea. */
export function SectionHeaderExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <SectionHeader
        title="Everything your product needs"
        description="Tokens, components and patterns that stay consistent from the first screen to the hundredth."
      />
      <SectionHeader
        align="center"
        title="Everything your product needs"
        description="Tokens, components and patterns that stay consistent from the first screen to the hundredth."
      />
    </div>
  );
}

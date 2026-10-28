import type { JSX } from 'react';
import { CtaBand } from '../cta-band/index';
import { ProfileCard } from '../profile-card/index';
import { ShaderSurface, type ShaderSurfaceVariant } from './index';

/**
 * Aurora as ProfileCard's cover (it follows the theme) and as CtaBand's background (`aurora-dark`,
 * dark on any page, as the band is).
 */
export function ShaderSurfaceExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 24, inlineSize: 640, maxInlineSize: '100%' }}>
      <ProfileCard
        style={{ inlineSize: 320 }}
        name="Alex Rivera"
        description="Product designer · Lisbon"
        cover={<ShaderSurface />}
      />
      <CtaBand
        title="Ship your next screen with Nizivo"
        description="One library, two themes, every state designed."
        background={<ShaderSurface variant="aurora-dark" />}
      />
    </div>
  );
}

const VARIANTS: readonly [ShaderSurfaceVariant, string][] = [
  ['aurora', 'Aurora'],
  ['aurora-dark', 'Aurora Dark'],
  ['contour', 'Contour'],
  ['contour-dark', 'Contour Dark'],
  ['dot-matrix', 'Dot Matrix'],
  ['glow-orb', 'Glow Orb'],
  ['glow-orb-dark', 'Glow Orb Dark'],
  ['rays', 'Rays'],
  ['mesh', 'Mesh'],
];

/** Every variant, as the design's Shader Surface types name them. */
export function ShaderSurfaceVariantsExample(): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
        gap: 16,
        inlineSize: 640,
        maxInlineSize: '100%',
      }}
    >
      {VARIANTS.map(([variant, name]) => (
        <figure key={variant} style={{ display: 'grid', gap: 8, margin: 0 }}>
          <div style={{ blockSize: 120, borderRadius: 12, overflow: 'hidden' }}>
            <ShaderSurface variant={variant} />
          </div>
          <figcaption>{name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

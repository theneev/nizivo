import type { JSX } from 'react';
import { CtaBand } from '../cta-band/index';
import { ProfileCard } from '../profile-card/index';
import { ShaderSurface } from './index';

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

import type { JSX } from 'react';
import { Button } from '../button/index';
import { PointerFx } from './index';

/** A product card that tilts toward the pointer and lifts, and a button that leans toward it. */
export function PointerFxExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <PointerFx
        style={{
          inlineSize: 200,
          padding: 20,
          borderRadius: 16,
          background: 'var(--nz-bg-surface)',
          border: '1px solid var(--nz-border-subtle)',
        }}
      >
        <strong>Sand mug</strong>
        <p style={{ margin: '4px 0 0' }}>€24.00</p>
      </PointerFx>
      <PointerFx effect="magnetic" render={<Button variant="primary" />}>
        Add to bag
      </PointerFx>
    </div>
  );
}

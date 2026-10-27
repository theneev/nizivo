import type { JSX } from 'react';
import { Tag } from './index';

/** Figma's states: a removable token, a filter on and off, and a disabled one. */
export function TagExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Tag label="Ceramics" removable />
      <Tag label="Ceramics" selected removable />
      <Tag label="Glassware" selected={false} />
      <Tag label="Ceramics" removable disabled />
    </div>
  );
}

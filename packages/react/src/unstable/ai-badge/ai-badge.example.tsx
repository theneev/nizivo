import type { JSX } from 'react';
import { AiBadge } from './index';

/** Two styles: subtle beside a block of text, solid where it must stand out. */
export function AiBadgeExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <AiBadge />
      <AiBadge variant="solid" />
    </div>
  );
}

/** Next to the content it describes, with its own words. */
export function AiBadgeLabelExample(): JSX.Element {
  return (
    <p style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
      Hand-thrown stoneware, glazed in small batches.
      <AiBadge labels={{ label: 'Edited with AI' }} />
    </p>
  );
}

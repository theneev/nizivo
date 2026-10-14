import type { JSX } from 'react';
import { ProgressRing } from './index';

export function ProgressRingExample(): JSX.Element {
  return (
    <div>
      <ProgressRing aria-label="Store setup" value={25} />
      <ProgressRing aria-label="Monthly goal" meter value={75} tone="success" size="lg" />
      <ProgressRing aria-label="Products imported" value={3} max={4} valueText="3 of 4" size="sm">
        3/4
      </ProgressRing>
    </div>
  );
}

import type { JSX } from 'react';
import { UsageMeter } from './index';

/** Credits left this month, and the warning from 80 %. */
export function UsageMeterExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, inlineSize: 320 }}>
      <UsageMeter value={640} max={1000} note="Resets on Nov 1 · Upgrade for more" />
      <UsageMeter value={910} max={1000} note="Resets on Nov 1 · Upgrade for more" />
    </div>
  );
}

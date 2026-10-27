import type { JSX } from 'react';
import { LivePulse } from './index';

/** A live session, and a sync under way: the words carry the meaning, the dot only draws the eye. */
export function LivePulseExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <LivePulse>Live</LivePulse>
      <LivePulse>Syncing</LivePulse>
    </div>
  );
}

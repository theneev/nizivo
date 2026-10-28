import type { JSX } from 'react';
import { VoiceOrb } from './index';

/** Three states: idle, listening with what was heard so far, and speaking. */
export function VoiceOrbExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
      <VoiceOrb state="idle" />
      <VoiceOrb state="listening">“Which products sold out last week?”</VoiceOrb>
      <VoiceOrb state="speaking" />
    </div>
  );
}

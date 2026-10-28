import type { JSX } from 'react';
import { VoiceOrb } from '../voice-orb/index';
import { GlowOrb } from './index';

/**
 * The shader orb in VoiceOrb's `orb` slot, speaking. Without a `level`, it simulates a voice; give
 * it a function that returns your audio's level (0 to 1) and it follows that each frame.
 */
export function GlowOrbExample(): JSX.Element {
  return <VoiceOrb state="speaking" orb={<GlowOrb state="speaking" />} />;
}

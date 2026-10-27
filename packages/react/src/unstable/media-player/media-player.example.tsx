import type { JSX } from 'react';
import { MediaPlayer } from './index';

/**
 * Figma's player, paused at 1:12 of 3:48. Wire `playing`, `currentTime`, `duration` and the
 * handlers to your `<audio>` or `<video>`; the player holds no media.
 */
export function MediaPlayerExample(): JSX.Element {
  return (
    <MediaPlayer
      title="Making the autumn glaze"
      subtitle="Moss & Kiln · Studio notes"
      playing={false}
      currentTime={72}
      duration={228}
    />
  );
}

'use client';
// The home page's two live leaves (M90): the player in the design-language band plays a silent
// 3:48 track (the player holds no media; it shows the state it is given), and the profile card's
// Follow toggles. Everything else on the home page is a server part.
import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { Button } from '@nizivo/react/button';
import { MediaPlayer } from '@nizivo/react/unstable/media-player';

const DURATION = 228;

export function HomePlayer({ artwork }: { artwork: ReactNode }): JSX.Element {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(72);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setTime((t) => (t + 1 >= DURATION ? 0 : t + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <MediaPlayer
      title="Making the autumn glaze"
      subtitle="Moss & Kiln · Studio notes"
      artwork={artwork}
      playing={playing}
      onPlayingChange={setPlaying}
      currentTime={time}
      duration={DURATION}
      onSeek={setTime}
      onSkipBack={() => setTime(0)}
      onSkipForward={() => setTime(0)}
    />
  );
}

export function FollowButton(): JSX.Element {
  const [following, setFollowing] = useState(false);
  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      aria-pressed={following}
      fullWidth
      onClick={() => setFollowing(!following)}
    >
      {/* one name in both states: aria-pressed carries the state (a changing name would not) */}
      Follow
    </Button>
  );
}

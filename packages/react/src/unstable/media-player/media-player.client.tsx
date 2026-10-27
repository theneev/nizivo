'use client';
// MediaPlayer (ARCHITECTURE.md §21.4a; D-do; Figma's Media Player 7397:85): the controls for a
// podcast, a tutorial or a product video. It holds no media of its own: the app wires it to its
// `<audio>` or `<video>` (`playing`, `currentTime`, `duration` in, `onPlayingChange`, `onSeek`,
// `onSkipBack`, `onSkipForward` out), so it never autoplays. Play and Pause are one button whose
// name changes with its icon ("Play", "Pause"); Figma also asks for `aria-pressed`, but a pressed
// state on a button whose name flips says the state twice, so the name alone carries it. The
// back and forward buttons always show, as Figma draws them. The scrubber is a Slider read as "1 minute 12 seconds
// of 3 minutes 48 seconds", whose arrow keys seek 5 seconds. UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { PauseGlyph, PlayGlyph, SkipBackGlyph, SkipForwardGlyph } from '../../_internal/glyphs';
import { formatLabel } from '../../i18n/format-label';
import { Slider } from '../slider/index';

/** MediaPlayer's own strings (§16.4): serialisable, English defaults. */
export interface MediaPlayerLabels {
  /** The toggle's name while paused. @default 'Play' */
  play: string;
  /** The toggle's name while playing. @default 'Pause' */
  pause: string;
  /** @default 'Skip back' */
  skipBack: string;
  /** @default 'Skip forward' */
  skipForward: string;
  /** The scrubber's name. @default 'Seek' */
  seek: string;
  /** The scrubber's value in words: `{current}` and `{duration}`. @default '{current} of {duration}' */
  position: string;
}

export interface MediaPlayerProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title: ReactNode;
  /** Under the title: who and where. */
  subtitle?: ReactNode;
  /** The artwork: an image, decorative unless you name it. */
  artwork?: ReactNode;
  /** Whether the media plays. */
  playing: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** Where it is, in seconds. */
  currentTime: number;
  /** How long it is, in seconds. */
  duration: number;
  /** The scrubber moved: seek the media there, in seconds. */
  onSeek?: (time: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  /** BCP 47 tag for the times. @default 'en-US' */
  locale?: string;
  labels?: Partial<MediaPlayerLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

/** 72 → "1:12"; 3725 → "1:02:05". */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** 72 → "1 minute 12 seconds", in the locale's unit words. */
function spoken(seconds: number, locale: string): string {
  const whole = Math.max(0, Math.floor(seconds));
  const unit = (value: number, name: 'hour' | 'minute' | 'second'): string =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'long' }).format(value);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return [
    h > 0 ? unit(h, 'hour') : '',
    m > 0 ? unit(m, 'minute') : '',
    s > 0 || whole === 0 ? unit(s, 'second') : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function MediaPlayer({
  title,
  subtitle,
  artwork,
  playing,
  onPlayingChange,
  currentTime,
  duration,
  onSeek,
  onSkipBack,
  onSkipForward,
  locale = 'en-US',
  labels: labelsProp,
  render,
  className,
  ...rest
}: MediaPlayerProps): JSX.Element {
  const labels = useLabels('mediaPlayer', labelsProp);
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'media-player',
      ...rest,
      className: cx('nz-media-player', className),
      children: (
        <>
          {artwork != null && <div className="nz-media-player-artwork">{artwork}</div>}
          <div className="nz-media-player-meta">
            <span className="nz-media-player-title" data-slot="media-player-title">
              {title}
            </span>
            {subtitle != null && <span className="nz-media-player-subtitle">{subtitle}</span>}
          </div>
          <div className="nz-media-player-scrubber">
            <Slider
              aria-label={labels?.seek ?? 'Seek'}
              showValue={false}
              min={0}
              max={Math.max(duration, 0)}
              step={1}
              // the arrows seek 5 seconds (Figma); the range steps 1, so any time shows as it is
              keyStep={5}
              value={Math.min(currentTime, duration)}
              valueText={(time) =>
                formatLabel(labels?.position ?? '{current} of {duration}', {
                  current: spoken(time, locale),
                  duration: spoken(duration, locale),
                })
              }
              {...(onSeek === undefined ? {} : { onValueChange: onSeek })}
            />
            <div className="nz-media-player-times" aria-hidden="true">
              <span>{clock(currentTime)}</span>
              <span>{clock(duration)}</span>
            </div>
          </div>
          <div className="nz-media-player-controls">
            <button
              type="button"
              className="nz-media-player-control"
              data-slot="media-player-control"
              aria-label={labels?.skipBack ?? 'Skip back'}
              onClick={onSkipBack}
            >
              <SkipBackGlyph />
            </button>
            <button
              type="button"
              className="nz-media-player-control nz-media-player-play"
              data-slot="media-player-control"
              aria-label={playing ? (labels?.pause ?? 'Pause') : (labels?.play ?? 'Play')}
              onClick={() => onPlayingChange?.(!playing)}
            >
              {playing ? <PauseGlyph /> : <PlayGlyph />}
            </button>
            <button
              type="button"
              className="nz-media-player-control"
              data-slot="media-player-control"
              aria-label={labels?.skipForward ?? 'Skip forward'}
              onClick={onSkipForward}
            >
              <SkipForwardGlyph />
            </button>
          </div>
        </>
      ),
    },
  );
}

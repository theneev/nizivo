// NO directive: VoiceOrb is server-safe, 0 KB of client JS of its own (ARCHITECTURE.md §21.4a; D-dn;
// Figma's Voice Orb 7411:301). Voice mode: an orb, a written state and one big control. The orb is
// decoration; the state is the label ("Listening…", a polite status) and the button (Mic, then
// Stop), an IconButtonStatic: no tooltip, so no client code, and the state is written beside it.
// Figma's orb is the Glow Orb shader, which waits for `@nizivo/lab` (§14.5, after 1.0): here
// it is drawn with CSS gradients, and `orb` takes a shader or any other picture in its place. What
// was heard belongs in `children`, as captions in text. The waveform and the orb's breathing stop
// under Reduced motion. UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { CircleStopGlyph, MicGlyph } from '../../_internal/glyphs';
// the static module, not the folder's index: that also exports IconButton and its tooltip leaf
import { IconButtonStatic } from '../../icon-button/icon-button-static';

/** What the voice assistant is doing: idle, listening or speaking. */
export type VoiceState = 'idle' | 'listening' | 'speaking';

/** VoiceOrb's own strings (§16.4): serialisable, English defaults. */
export interface VoiceOrbLabels {
  /** @default 'Tap to talk' */
  idle: string;
  /** @default 'Listening…' */
  listening: string;
  /** @default 'Speaking…' */
  speaking: string;
  /** The button's name while idle. @default 'Start talking' */
  start: string;
  /** The button's name while listening or speaking. @default 'Stop' */
  stop: string;
}

export interface VoiceOrbProps extends Omit<ComponentPropsWithRef<'div'>, 'onToggle'> {
  state: VoiceState;
  /** The button calls it: start while idle, stop while listening or speaking. */
  onToggle?: () => void;
  /** Replaces the CSS orb, for example a Glow Orb shader. Decorative: it is hidden from assistive technology. */
  orb?: ReactNode;
  labels?: Partial<VoiceOrbLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

// nine bars; voice-orb.css gives each its height (no style attribute, for a strict CSP)
const BARS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function VoiceOrb({
  state,
  onToggle,
  orb,
  labels,
  render,
  className,
  children,
  ...rest
}: VoiceOrbProps): ReactElement {
  const live = state !== 'idle';
  const text =
    state === 'listening'
      ? (labels?.listening ?? 'Listening…')
      : state === 'speaking'
        ? (labels?.speaking ?? 'Speaking…')
        : (labels?.idle ?? 'Tap to talk');
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'voice-orb',
      'data-tone': state,
      ...rest,
      className: cx('nz-voice-orb', className),
      children: (
        <>
          <span className="nz-voice-orb-orb" data-slot="voice-orb-orb" aria-hidden="true">
            {orb ?? <span className="nz-voice-orb-sphere" />}
          </span>
          {live && (
            <span className="nz-voice-orb-wave" aria-hidden="true">
              {BARS.map((bar) => (
                <span key={bar} className="nz-voice-orb-bar" />
              ))}
            </span>
          )}
          <span className="nz-voice-orb-label" data-slot="voice-orb-label" aria-live="polite">
            {text}
          </span>
          <IconButtonStatic
            className="nz-voice-orb-button"
            data-slot="voice-orb-button"
            variant={live ? 'critical' : 'primary'}
            size="lg"
            aria-label={live ? (labels?.stop ?? 'Stop') : (labels?.start ?? 'Start talking')}
            icon={live ? <CircleStopGlyph /> : <MicGlyph />}
            onClick={onToggle}
          />
          {children != null && (
            <div className="nz-voice-orb-captions" data-slot="voice-orb-captions">
              {children}
            </div>
          )}
        </>
      ),
    },
  );
}

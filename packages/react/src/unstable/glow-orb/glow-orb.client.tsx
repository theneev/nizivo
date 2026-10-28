'use client';
// GlowOrb (M89, D-du; Figma's Glow Orb 7389:78, drawn in VoiceOrb 7411:301): the voice orb as a
// WebGL shader, for VoiceOrb's `orb` slot or on its own. A glossy sphere that grows with the voice
// level, its outline moving while it is live and its light drifting so the highlight changes angle;
// the halo widens with the voice. No library: one fragment shader (glow-orb-gl.ts). The server, and a
// browser without WebGL, show the CSS orb VoiceOrb draws (the poster); the canvas takes over once its
// first frame is drawn. Decorative: hidden from assistive technology, so the state belongs in words
// beside it (VoiceOrb's label). Reduced motion draws one still frame.
// UNSTABLE: new, and the design has not reviewed it on devices.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type JSX,
} from 'react';
import { cx } from '../../_internal/cx';
import { mergeProps } from '../../contracts/merge-props';
import {
  startGlowOrb,
  type GlowOrbInput,
  type GlowOrbRenderer,
  type GlowOrbState,
} from './glow-orb-gl';

export type { GlowOrbState } from './glow-orb-gl';

export interface GlowOrbProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** VoiceOrb's state: the outline moves while listening or speaking. @default 'idle' */
  state?: GlowOrbState;
  /**
   * The voice level, 0 to 1: a number, or a function the orb calls each frame (a Web Audio
   * analyser's level), so the page does not re-render 60 times a second. Without it, the orb
   * simulates a voice for the state.
   */
  level?: number | (() => number);
}

export function GlowOrb({ state = 'idle', level, className, ...rest }: GlowOrbProps): JSX.Element {
  const [host, setHost] = useState<HTMLSpanElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const input = useRef<GlowOrbInput>({ state, level });
  const renderer = useRef<GlowOrbRenderer | null>(null);
  const [ready, setReady] = useState(false);

  // the renderer reads the latest props each frame, and draws again now when it is still
  useLayoutEffect(() => {
    input.current = { state, level };
    renderer.current?.wake();
  });

  useEffect(() => {
    if (host === null || canvas === null) return undefined;
    const started = startGlowOrb(
      host,
      canvas,
      () => input.current,
      () => setReady(true),
    );
    renderer.current = started;
    return () => {
      started?.destroy();
      renderer.current = null;
    };
  }, [host, canvas]);

  return (
    <span
      {...mergeProps(rest, { ref: setHost })}
      className={cx('nz-glow-orb', className)}
      data-slot="glow-orb"
      aria-hidden="true"
    >
      <span className="nz-glow-orb-poster" hidden={ready}>
        <span className="nz-glow-orb-sphere" />
      </span>
      <canvas ref={setCanvas} className="nz-glow-orb-canvas" />
    </span>
  );
}

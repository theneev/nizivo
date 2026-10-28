'use client';
// ShaderSurface (M89, D-dv; Figma's Shader Surface 7389:78): a moving background drawn by a WebGL
// shader, for the backgrounds Figma fills with one (CtaBand's, BentoTile's, ProfileCard's cover) or
// a section of a page. It fills its box. No library: one fragment shader per variant
// (shader-surface-gl.ts) on the shared runtime (`_internal/shader-canvas.ts`). The server, and a
// browser without WebGL, show a CSS poster in the same colours; the canvas takes over once its
// first frame is drawn. Decorative: hidden from assistive technology, and text never sits on it
// without a surface of its own. Reduced motion draws one still frame.
// UNSTABLE: new; Aurora first, Figma's other types to follow.
import { useEffect, useState, type ComponentPropsWithRef, type JSX } from 'react';
import { cx } from '../../_internal/cx';
import { mergeProps } from '../../contracts/merge-props';
import { startShaderSurface, type ShaderSurfaceVariant } from './shader-surface-gl';

export type { ShaderSurfaceVariant } from './shader-surface-gl';

export interface ShaderSurfaceProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /**
   * Figma's Shader Surface type. `aurora` follows the theme; `aurora-dark` keeps its dark colours on
   * a light page (CtaBand's band). @default 'aurora'
   */
  variant?: ShaderSurfaceVariant;
}

export function ShaderSurface({
  variant = 'aurora',
  className,
  ...rest
}: ShaderSurfaceProps): JSX.Element {
  const [host, setHost] = useState<HTMLSpanElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  // a new variant has new colours: the run starts again and reads them
  useEffect(() => {
    if (host === null || canvas === null) return undefined;
    const started = startShaderSurface(host, canvas, variant, () => setReady(true));
    return () => started?.destroy();
  }, [host, canvas, variant]);

  return (
    <span
      {...mergeProps(rest, { ref: setHost })}
      className={cx('nz-shader-surface', className)}
      data-slot="shader-surface"
      data-variant={variant}
      aria-hidden="true"
    >
      <span className="nz-shader-surface-poster" hidden={ready} />
      <canvas ref={setCanvas} className="nz-shader-surface-canvas" />
    </span>
  );
}

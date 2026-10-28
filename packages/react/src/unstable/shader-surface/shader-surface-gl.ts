// ShaderSurface's shaders (M89, D-dv), on the shared runtime (`_internal/shader-canvas.ts`). Figma's
// Shader Surface (7389:78) sets one shader per Type; its sources are not readable, so each is drawn
// to match the type's parameters and look (`docs/figma/17-shaders-2026-10-28.md`); the programs are
// in `programs/`, one chunk each, loaded when a surface of that variant mounts. Every program
// reads four colours, the host's computed logical border colours, which shader-surface.css sets per
// variant from tokens: `u_c0` the ground, then `u_c1`, `u_c2` and `u_c3`, each variant's three tones.
// `u_dark` is 1 on a dark ground. Plain DOM and WebGL: no directive.
import { rgba, runShader, type Rgba, type ShaderRun } from '../../_internal/shader-canvas';

/** Figma's Shader Surface types; a `-dark` one keeps its dark colours on a light page. */
export type ShaderSurfaceVariant =
  | 'aurora'
  | 'aurora-dark'
  | 'contour'
  | 'contour-dark'
  | 'dot-matrix'
  | 'glow-orb'
  | 'glow-orb-dark'
  | 'mesh'
  | 'rays';

/**
 * Each variant's program, loaded on first use: a page downloads only the shaders it shows. A `-dark`
 * variant shares its program and differs only in the colours its CSS resolves.
 */
const PROGRAMS: Readonly<Record<ShaderSurfaceVariant, () => Promise<{ default: string }>>> = {
  aurora: () => import('./programs/aurora'),
  'aurora-dark': () => import('./programs/aurora'),
  contour: () => import('./programs/contour'),
  'contour-dark': () => import('./programs/contour'),
  'dot-matrix': () => import('./programs/dot-matrix'),
  'glow-orb': () => import('./programs/glow-orb'),
  'glow-orb-dark': () => import('./programs/glow-orb'),
  mesh: () => import('./programs/mesh'),
  rays: () => import('./programs/rays'),
};

/** The variant's fragment source. */
export async function loadProgram(variant: ShaderSurfaceVariant): Promise<string> {
  return (await PROGRAMS[variant]()).default;
}

interface Colours {
  c0: Rgba;
  c1: Rgba;
  c2: Rgba;
  c3: Rgba;
}

const OK = /^okl(ab|ch)\(\s*([\d.]+)(%?)\s+([-\d.e]+)\s+([-\d.e]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/;

/** sRGB's transfer function, from linear light. */
const gamma = (c: number): number =>
  Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));

/**
 * A computed colour as sRGB: `rgb()` and `color(srgb …)` through the runtime, and the `oklab()` and
 * `oklch()` a token mix (`color-mix(in oklab, …)`) or a hook computes to, converted here (Björn
 * Ottosson's OKLab matrices).
 */
function colour(css: string): Rgba {
  const ok = OK.exec(css);
  if (ok === null) return rgba(css);
  const lightness = Number(ok[2]) / (ok[3] === '%' ? 100 : 1);
  let a = Number(ok[4]);
  let b = Number(ok[5]);
  if (ok[1] === 'ch') {
    const hue = (b * Math.PI) / 180;
    [a, b] = [a * Math.cos(hue), a * Math.sin(hue)];
  }
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const alpha = ok[6] === undefined ? 1 : Number(ok[6]) / (ok[7] === '%' ? 100 : 1);
  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha,
  ];
}

/** Relative luminance, enough to tell a light ground from a dark one. */
const luminance = (c: Rgba): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * Starts a program (`loadProgram`) on `canvas`, sized to `host`; `null` when there is no WebGL (the
 * poster stays). `onReady` runs once the first frame is drawn.
 */
export function startShaderSurface(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  frag: string,
  onReady: () => void,
): ShaderRun | null {
  return runShader<Colours>(
    host,
    canvas,
    {
      frag,
      read: (css) => ({
        c0: colour(css.getPropertyValue('border-block-start-color')),
        c1: colour(css.getPropertyValue('border-inline-end-color')),
        c2: colour(css.getPropertyValue('border-block-end-color')),
        c3: colour(css.getPropertyValue('border-inline-start-color')),
      }),
      frame(gl, at, c) {
        gl.uniform4f(at('u_c0'), ...c.c0);
        gl.uniform4f(at('u_c1'), ...c.c1);
        gl.uniform4f(at('u_c2'), ...c.c2);
        gl.uniform4f(at('u_c3'), ...c.c3);
        gl.uniform1f(at('u_dark'), luminance(c.c0) > 0.5 ? 0 : 1);
      },
    },
    onReady,
  );
}

// ShaderSurface's shaders (M89, D-dv), on the shared runtime (`_internal/shader-canvas.ts`). Figma's
// Shader Surface (7389:78) sets one shader per Type; its sources are not readable, so each is drawn
// to match the type's parameters and look. Aurora: soft vertical curtains of light that sway, over a
// ground that runs from pale at the top to the mid colour at the bottom, the deep colour gathering
// low, and a fine grain (Figma: curtains 0.7, light 0.5 or 0.2 dark, speed 0.4, grain 0.04). Its
// colours are the host's computed logical border colours, which shader-surface.css sets from tokens.
// Plain DOM and WebGL: no directive.
import {
  GLSL_NOISE,
  rgba,
  runShader,
  type Rgba,
  type ShaderRun,
} from '../../_internal/shader-canvas';

/** Figma's Shader Surface types built so far; the dark one keeps its dark colours on a light page. */
export type ShaderSurfaceVariant = 'aurora' | 'aurora-dark';

const AURORA = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_ground;
uniform vec3 u_mid;
uniform vec3 u_curtain;
uniform vec3 u_deep;
uniform float u_light;
${GLSL_NOISE}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float y = 1.0 - uv.y;
  float x = uv.x * u_res.x / u_res.y;
  float t = u_t * 0.4;

  // the ground: pale at the top, the mid colour toward the bottom
  vec3 col = mix(u_ground, u_mid, smoothstep(0.2, 1.0, y));

  // the curtains: soft vertical bands, bent and dimmed by slow noise, swaying sideways
  float bend = fbm(vec2(x * 0.8 + t * 0.15, y * 0.9 - t * 0.1));
  float band = pow(0.5 + 0.5 * sin(x * 3.4 + bend * 2.6 + t * 0.25), 2.5);
  float each = smoothstep(0.25, 0.75, fbm(vec2(x * 1.3 - t * 0.12, 0.5 + t * 0.05)));
  float vertical = smoothstep(0.04, 0.3, y) * (1.0 - smoothstep(0.62, 0.98, y));
  float curtain = clamp(band * (0.3 + 0.7 * each) * vertical * 0.7 * 1.9, 0.0, 1.0);
  col = mix(col, u_curtain, curtain);

  // depth: the deep colour gathers low, more on a dark ground
  float deep = smoothstep(0.55, 1.0, y) * (0.4 + 0.6 * fbm(vec2(x * 0.9 + t * 0.1, 3.0)));
  col = mix(col, u_deep, deep * (1.0 - u_light) * 0.6);
  col += (1.0 - y) * 0.04 * u_light;

  col += (hash(gl_FragCoord.xy + fract(u_t) * 13.0) - 0.5) * 0.07;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Each variant's program; the two Aurora variants differ only in the colours their CSS resolves. */
const PROGRAMS: Readonly<Record<ShaderSurfaceVariant, string>> = {
  aurora: AURORA,
  'aurora-dark': AURORA,
};

interface AuroraColours {
  ground: Rgba;
  mid: Rgba;
  curtain: Rgba;
  deep: Rgba;
}

const rgb = (c: Rgba): [number, number, number] => [c[0], c[1], c[2]];

/** Relative luminance, enough to tell a light ground from a dark one. */
const luminance = (c: Rgba): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * Starts the `variant`'s shader on `canvas`, sized to `host`; `null` when there is no WebGL (the
 * poster stays).
 * `onReady` runs once the first frame is drawn.
 */
export function startShaderSurface(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  variant: ShaderSurfaceVariant,
  onReady: () => void,
): ShaderRun | null {
  const frag = PROGRAMS[variant];
  return runShader<AuroraColours>(
    host,
    canvas,
    {
      frag,
      read: (css) => ({
        ground: rgba(css.getPropertyValue('border-block-start-color')),
        mid: rgba(css.getPropertyValue('border-inline-end-color')),
        curtain: rgba(css.getPropertyValue('border-block-end-color')),
        deep: rgba(css.getPropertyValue('border-inline-start-color')),
      }),
      frame(gl, at, c) {
        gl.uniform3f(at('u_ground'), ...rgb(c.ground));
        gl.uniform3f(at('u_mid'), ...rgb(c.mid));
        gl.uniform3f(at('u_curtain'), ...rgb(c.curtain));
        gl.uniform3f(at('u_deep'), ...rgb(c.deep));
        // Figma's light: 0.5 on a light ground, 0.2 on a dark one
        gl.uniform1f(at('u_light'), luminance(c.ground) > 0.5 ? 0.5 : 0.2);
      },
    },
    onReady,
  );
}

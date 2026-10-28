// GlowOrb's shader (M89, D-du), on the shared runtime (`_internal/shader-canvas.ts`). The sphere is
// shaded analytically (a normal from the disc), lit by a light that swings a little, with a surface
// pattern that turns, a Fresnel rim, a glossy highlight and a halo that widens with the voice. Its
// colours are the host's computed `color` (the light), `outline-color` (the deep) and
// `text-decoration-color` (the halo, its alpha the halo's strength), which glow-orb.css sets from
// tokens. Plain DOM and WebGL: no React, no directive.
import { rgba, runShader, type Rgba, type ShaderRun } from '../../_internal/shader-canvas';

/** The voice states, as VoiceOrb names them. */
export type GlowOrbState = 'idle' | 'listening' | 'speaking';

/** What the orb follows, read each frame. */
export interface GlowOrbInput {
  state: GlowOrbState;
  /** 0 to 1, or a function the orb calls each frame; absent: a voice simulated for the state. */
  level: number | (() => number) | undefined;
}

/**
 * The orb as a GLSL function, shared with ShaderSurface's Glow Orb background: the sphere and its halo
 * at `p` (a unit of half the square's side), premultiplied. `clip` fades the halo out before the
 * square's edge (GlowOrb's own box); 0 lets it spread over a wider surface.
 */
export const GLSL_ORB = `
vec4 glowOrb(vec2 p, float aa, float t, float level, float live, vec3 light, vec3 deep, vec4 haloColour, float clip) {
  float d = length(p);
  float a = atan(p.y, p.x);

  float wob = 0.006 * sin(3.0 * a + t * 0.9) + 0.004 * sin(5.0 * a - t * 1.3)
    + 0.003 * sin(2.0 * a + t * 0.55);
  wob *= 1.0 + live * (0.5 + 1.8 * level);
  float breathe = 0.012 * sin(t * 1.3);
  float r = 0.66 * (1.0 + 0.11 * level + breathe * (1.0 - live * 0.5)) + wob;
  float inside = 1.0 - smoothstep(r - aa, r + aa, d);

  vec2 q = p / r;
  float z = sqrt(max(1.0 - dot(q, q), 0.0));
  vec3 n = normalize(vec3(q, z));
  vec3 L = normalize(vec3(-0.55 + 0.16 * sin(t * 0.31), 0.60 + 0.12 * cos(t * 0.23), 0.78));
  float diff = clamp(dot(n, L), 0.0, 1.0);

  float lon = atan(n.x, n.z) + t * (0.12 + 0.25 * live);
  float swirl = sin(3.0 * lon + 2.0 * n.y + t * 0.4) * sin(2.0 * n.y - lon * 1.5 - t * 0.3);
  vec3 base = mix(deep, light, smoothstep(0.08, 0.92, diff + 0.06 * swirl));
  base += light * pow(clamp(dot(-n, L) * 0.5 + 0.5, 0.0, 1.0), 3.0) * 0.12;
  float fres = pow(1.0 - z, 3.0);
  vec3 room = mix(deep * 0.7, vec3(1.0), clamp(n.y * 0.5 + 0.55, 0.0, 1.0));
  base = mix(base, room, fres * 0.35);
  float nh = clamp(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0, 1.0);
  vec3 sphere = base + vec3(1.0) * (pow(nh, 140.0) * 0.75 + pow(nh, 22.0) * 0.14);
  sphere *= 0.86 + 0.14 * smoothstep(-0.2, 0.4, dot(n, L));

  float w = 0.20 + 0.10 * level;
  float halo = exp(-pow(max(d - r * 0.92, 0.0) / w, 2.0)) * (0.75 + 0.25 * level);
  halo *= mix(1.0, 1.0 - smoothstep(0.94, 1.0, d), clip);
  float haloA = halo * haloColour.a;

  return vec4(sphere * inside + haloColour.rgb * haloA * (1.0 - inside), inside + haloA * (1.0 - inside));
}`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_level;
uniform float u_live;
uniform vec3 u_light;
uniform vec3 u_deep;
uniform vec4 u_halo;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
${GLSL_ORB}

void main() {
  float s = 0.5 * min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / s;
  vec4 orb = glowOrb(p, 1.6 / s, u_t, u_level, u_live, u_light, u_deep, u_halo, 1.0);
  orb.rgb += (hash(gl_FragCoord.xy + fract(u_t) * 17.0) - 0.5) * (1.5 / 255.0) * orb.a;
  gl_FragColor = orb;
}`;

/** A 0 to 1 hash of an integer. */
function hash(n: number): number {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
}

/** A smooth 0 to 1 value noise in one dimension, for the simulated voice. */
function noise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

/** A voice for the state when the app gives no level: soft while listening, syllables while speaking. */
function simulated(state: GlowOrbState, t: number): number {
  if (state === 'listening') return 0.1 + 0.22 * noise(t * 2.1) * noise(t * 0.9 + 4);
  if (state === 'speaking') {
    const syllables = Math.max(0, noise(t * 7) * 1.6 - 0.45);
    const phrase = noise(t * 0.55 + 9) > 0.32 ? 1 : 0.15;
    return Math.min(1, syllables * phrase * 1.15);
  }
  return 0;
}

function levelOf(input: GlowOrbInput, t: number): number {
  const { level } = input;
  const value = typeof level === 'function' ? level() : level;
  if (value === undefined) return simulated(input.state, t);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

interface Colours {
  light: Rgba;
  deep: Rgba;
  halo: Rgba;
}

/**
 * Starts the orb on `canvas`, sized to `host`; `null` when there is no WebGL (the poster stays).
 * `onReady` runs once the first frame is drawn.
 */
export function startGlowOrb(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  input: () => GlowOrbInput,
  onReady: () => void,
): ShaderRun | null {
  let level = 0;
  let live = input().state === 'idle' ? 0 : 1;
  return runShader<Colours>(
    host,
    canvas,
    {
      frag: FRAG,
      read: (css) => ({
        light: rgba(css.color),
        deep: rgba(css.outlineColor),
        halo: rgba(css.textDecorationColor),
      }),
      frame(gl, at, c, t, dt) {
        const now = input();
        const goal = levelOf(now, t);
        // quick to rise, slower to fall, as a level meter moves
        level =
          dt === 0 ? goal : level + (goal - level) * (1 - Math.exp(-dt * (goal > level ? 14 : 5)));
        const target = now.state === 'idle' ? 0 : 1;
        live = dt === 0 ? target : live + (target - live) * (1 - Math.exp(-dt * 3));
        gl.uniform1f(at('u_level'), level);
        gl.uniform1f(at('u_live'), live);
        gl.uniform3f(at('u_light'), c.light[0], c.light[1], c.light[2]);
        gl.uniform3f(at('u_deep'), c.deep[0], c.deep[1], c.deep[2]);
        gl.uniform4f(at('u_halo'), c.halo[0], c.halo[1], c.halo[2], c.halo[3]);
      },
    },
    onReady,
  );
}

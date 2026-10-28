// GlowOrb's renderer (M89, D-du): one WebGL1 fragment shader over a triangle that covers the canvas,
// no library. The sphere is shaded analytically (a normal from the disc), lit by a light that swings
// a little, with a surface pattern that turns, a Fresnel rim, a glossy highlight and a halo that
// widens with the voice. It draws only while the orb is on screen and the page is shown, at a pixel
// ratio of at most 2; under reduced motion it draws one still frame, again when its input changes.
// Its colours are the host's computed `color` (the light), `outline-color` (the deep) and
// `text-decoration-color` (the halo, its alpha the halo's strength), which glow-orb.css sets from
// tokens, so a theme change only needs a read. Plain DOM and WebGL: no React, no directive.

/** The voice states, as VoiceOrb names them. */
export type GlowOrbState = 'idle' | 'listening' | 'speaking';

/** What the orb follows, read each frame. */
export interface GlowOrbInput {
  state: GlowOrbState;
  /** 0 to 1, or a function the orb calls each frame; absent: a voice simulated for the state. */
  level: number | (() => number) | undefined;
}

export interface GlowOrbRenderer {
  /** Draws again after a change, or restarts the loop after a pause. */
  wake(): void;
  destroy(): void;
}

const VERT = 'attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }';

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

void main() {
  float s = 0.5 * min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / s;
  float d = length(p);
  float a = atan(p.y, p.x);
  float t = u_t;

  float wob = 0.006 * sin(3.0 * a + t * 0.9) + 0.004 * sin(5.0 * a - t * 1.3)
    + 0.003 * sin(2.0 * a + t * 0.55);
  wob *= 1.0 + u_live * (0.5 + 1.8 * u_level);
  float breathe = 0.012 * sin(t * 1.3);
  float r = 0.66 * (1.0 + 0.11 * u_level + breathe * (1.0 - u_live * 0.5)) + wob;
  float aa = 1.6 / s;
  float inside = 1.0 - smoothstep(r - aa, r + aa, d);

  vec2 q = p / r;
  float z = sqrt(max(1.0 - dot(q, q), 0.0));
  vec3 n = normalize(vec3(q, z));
  vec3 L = normalize(vec3(-0.55 + 0.16 * sin(t * 0.31), 0.60 + 0.12 * cos(t * 0.23), 0.78));
  float diff = clamp(dot(n, L), 0.0, 1.0);

  float lon = atan(n.x, n.z) + t * (0.12 + 0.25 * u_live);
  float swirl = sin(3.0 * lon + 2.0 * n.y + t * 0.4) * sin(2.0 * n.y - lon * 1.5 - t * 0.3);
  vec3 base = mix(u_deep, u_light, smoothstep(0.08, 0.92, diff + 0.06 * swirl));
  base += u_light * pow(clamp(dot(-n, L) * 0.5 + 0.5, 0.0, 1.0), 3.0) * 0.12;
  float fres = pow(1.0 - z, 3.0);
  vec3 room = mix(u_deep * 0.7, vec3(1.0), clamp(n.y * 0.5 + 0.55, 0.0, 1.0));
  base = mix(base, room, fres * 0.35);
  float nh = clamp(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0, 1.0);
  vec3 sphere = base + vec3(1.0) * (pow(nh, 140.0) * 0.75 + pow(nh, 22.0) * 0.14);
  sphere *= 0.86 + 0.14 * smoothstep(-0.2, 0.4, dot(n, L));

  float w = 0.20 + 0.10 * u_level;
  float halo = exp(-pow(max(d - r * 0.92, 0.0) / w, 2.0)) * (0.75 + 0.25 * u_level);
  halo *= 1.0 - smoothstep(0.94, 1.0, d);
  float haloA = halo * u_halo.a;

  vec3 rgb = sphere * inside + u_halo.rgb * haloA * (1.0 - inside);
  float alpha = inside + haloA * (1.0 - inside);
  rgb += (hash(gl_FragCoord.xy + fract(t) * 17.0) - 0.5) * (1.5 / 255.0) * alpha;
  gl_FragColor = vec4(rgb, alpha);
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

function reducedMotion(element: Element): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    element.closest('[data-nz-motion="reduce"]') !== null
  );
}

type Rgba = [number, number, number, number];

const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)$/;
const SRGB = /^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/;

function alphaOf(value: string | undefined, percent: string | undefined): number {
  if (value === undefined) return 1;
  return percent === '%' ? Number(value) / 100 : Number(value);
}

/**
 * A computed colour as 0 to 1 sRGB and alpha. Browsers compute the tokens' hex values as `rgb()` and
 * the halo's `color-mix(in srgb, …)` as `color(srgb …)`, both read here; any other syntax (a hook set
 * to `oklch()`, say) goes through a 1×1 2D canvas. Reading pixels back from a canvas stalls the GPU,
 * so that path is the exception.
 */
function rgba(css: string): Rgba {
  const rgb = RGB.exec(css);
  if (rgb !== null) {
    return [
      Number(rgb[1]) / 255,
      Number(rgb[2]) / 255,
      Number(rgb[3]) / 255,
      alphaOf(rgb[4], rgb[5]),
    ];
  }
  const srgb = SRGB.exec(css);
  if (srgb !== null) {
    return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), alphaOf(srgb[4], srgb[5])];
  }
  return probed(css);
}

function probed(css: string): Rgba {
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (probe === null) return [0, 0, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
}

function compile(gl: WebGLRenderingContext): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, FRAG],
  ] as const) {
    const shader = gl.createShader(type);
    if (shader === null) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) return null;
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) === true ? program : null;
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
): GlowOrbRenderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (gl === null) return null;
  const program = compile(gl);
  if (program === null) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const at = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const u = {
    res: at('u_res'),
    t: at('u_t'),
    level: at('u_level'),
    live: at('u_live'),
    light: at('u_light'),
    deep: at('u_deep'),
    halo: at('u_halo'),
  };

  let colours = { light: [0, 0, 0, 0], deep: [0, 0, 0, 0], halo: [0, 0, 0, 0] };
  const readColours = (): void => {
    const css = getComputedStyle(host);
    colours = {
      light: rgba(css.color),
      deep: rgba(css.outlineColor),
      halo: rgba(css.textDecorationColor),
    };
  };
  readColours();

  let visible = true;
  let frame = 0;
  let last = 0;
  let clock = 0;
  let level = 0;
  let live = input().state === 'idle' ? 0 : 1;
  let ready = false;
  let lost = false;

  const still = (): boolean => reducedMotion(host);
  const running = (): boolean => !lost && visible && !document.hidden && !still();

  const draw = (dt: number): void => {
    const now = input();
    const goal = levelOf(now, clock);
    // quick to rise, slower to fall, as a level meter moves
    level =
      dt === 0 ? goal : level + (goal - level) * (1 - Math.exp(-dt * (goal > level ? 14 : 5)));
    const target = now.state === 'idle' ? 0 : 1;
    live = dt === 0 ? target : live + (target - live) * (1 - Math.exp(-dt * 3));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.t, clock);
    gl.uniform1f(u.level, level);
    gl.uniform1f(u.live, live);
    gl.uniform3f(u.light, colours.light[0] ?? 0, colours.light[1] ?? 0, colours.light[2] ?? 0);
    gl.uniform3f(u.deep, colours.deep[0] ?? 0, colours.deep[1] ?? 0, colours.deep[2] ?? 0);
    gl.uniform4f(
      u.halo,
      colours.halo[0] ?? 0,
      colours.halo[1] ?? 0,
      colours.halo[2] ?? 0,
      colours.halo[3] ?? 0,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  const loop = (now: number): void => {
    frame = 0;
    if (!running()) return;
    const dt = last === 0 ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    clock += dt;
    draw(dt);
    frame = requestAnimationFrame(loop);
  };

  const wake = (): void => {
    if (lost) return;
    if (running()) {
      if (frame === 0) {
        last = 0;
        frame = requestAnimationFrame(loop);
      }
    } else if (still()) {
      // the still frame: always the same instant, so it is the same picture every time
      clock = 0;
      draw(0);
    }
  };

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const box = host.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    if (frame === 0) wake();
  };

  const sized = new ResizeObserver(resize);
  sized.observe(host);
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    wake();
  });
  seen.observe(host);
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const retheme = (): void => {
    readColours();
    if (frame === 0) wake();
  };
  // a theme switch or a motion override on <html> (data-nz-theme, data-nz-motion, class, style)
  const page = new MutationObserver(retheme);
  page.observe(document.documentElement, { attributes: true });
  const onLost = (event: Event): void => {
    event.preventDefault();
    lost = true;
  };
  scheme.addEventListener('change', retheme);
  motion.addEventListener('change', wake);
  document.addEventListener('visibilitychange', wake);
  canvas.addEventListener('webglcontextlost', onLost);
  resize();

  return {
    wake,
    destroy() {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      lost = true;
      sized.disconnect();
      seen.disconnect();
      page.disconnect();
      scheme.removeEventListener('change', retheme);
      motion.removeEventListener('change', wake);
      document.removeEventListener('visibilitychange', wake);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteProgram(program);
    },
  };
}

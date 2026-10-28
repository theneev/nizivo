// The shaders' shared runtime (M89; D-du, D-dv): one WebGL 1 fragment shader over a triangle that
// covers a canvas, no library. It draws only while the host is on screen and the page is shown, at a
// pixel ratio of at most 2, with `powerPreference: 'low-power'`; under reduced motion (the media
// query or `data-nz-motion="reduce"`) it draws one frame at t = 0, again when `wake()` is called.
// Each shader reads its colours from the host's computed style (set from tokens in its CSS), again
// when the theme changes. GlowOrb and ShaderSurface run on it. Plain DOM and WebGL: no directive.

/** A colour as 0 to 1 sRGB and alpha. */
export type Rgba = [number, number, number, number];

/** What one shader brings: its fragment source, what it reads from CSS, and its uniforms per frame. */
export interface ShaderProgram<Read> {
  frag: string;
  read(css: CSSStyleDeclaration): Read;
  /**
   * Sets the frame's uniforms; `dt` is 0 for a still frame. `u_res` (device pixels), `u_t` (seconds)
   * and `u_dpr` (device pixels per CSS pixel) are set already.
   */
  frame(
    gl: WebGLRenderingContext,
    at: (name: string) => WebGLUniformLocation | null,
    read: Read,
    t: number,
    dt: number,
  ): void;
}

export interface ShaderRun {
  /** Draws again after a change, or restarts the loop after a pause. */
  wake(): void;
  /** Stops, and gives the WebGL context back (a page may hold about sixteen at once). */
  destroy(): void;
}

/**
 * The lose-context extension of each canvas whose context a run gave back, so a run that starts on
 * the same canvas again (React mounts an effect twice in development) can ask for it back.
 */
const released = new WeakMap<HTMLCanvasElement, WEBGL_lose_context>();

const VERT = 'attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }';

const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)$/;
const SRGB = /^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/;

function alphaOf(value: string | undefined, percent: string | undefined): number {
  if (value === undefined) return 1;
  return percent === '%' ? Number(value) / 100 : Number(value);
}

/**
 * A computed colour as 0 to 1 sRGB and alpha. The shaders' CSS wraps every colour it hands over in
 * `color-mix(in srgb, …)`, which browsers compute as `color(srgb …)` whatever the token or hook's own
 * syntax; `rgb()` is read too. Anything else reads as transparent black (no pixel read-back, which
 * stalls the GPU).
 */
export function rgba(css: string): Rgba {
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
  return srgb === null
    ? [0, 0, 0, 0]
    : [Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), alphaOf(srgb[4], srgb[5])];
}

/** A shared GLSL prelude: the grain hash and a smooth 2D value noise. */
export const GLSL_NOISE = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

function reducedMotion(element: Element): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    element.closest('[data-nz-motion="reduce"]') !== null
  );
}

function compile(gl: WebGLRenderingContext, frag: string): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, frag],
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
 * Runs `shader` on `canvas`, sized to `host`; `null` when there is no WebGL (the poster stays).
 * `onReady` runs once the first frame is drawn. On a canvas whose context an earlier run gave back,
 * it asks for the context again and starts once it is restored.
 */
export function runShader<Read>(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  shader: ShaderProgram<Read>,
  onReady: () => void,
): ShaderRun | null {
  const lost = released.get(canvas);
  if (lost === undefined) return start(host, canvas, shader, onReady);
  released.delete(canvas);
  let run: ShaderRun | null = null;
  let stopped = false;
  const restored = (): void => {
    if (!stopped) run = start(host, canvas, shader, onReady);
  };
  canvas.addEventListener('webglcontextrestored', restored, { once: true });
  lost.restoreContext();
  return {
    wake: () => run?.wake(),
    destroy() {
      stopped = true;
      canvas.removeEventListener('webglcontextrestored', restored);
      run?.destroy();
    },
  };
}

function start<Read>(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  shader: ShaderProgram<Read>,
  onReady: () => void,
): ShaderRun | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (gl === null) return null;
  const program = compile(gl, shader.frag);
  if (program === null) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const locations = new Map<string, WebGLUniformLocation | null>();
  const at = (name: string): WebGLUniformLocation | null => {
    if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
    return locations.get(name) ?? null;
  };

  let read = shader.read(getComputedStyle(host));
  let visible = true;
  let frame = 0;
  let last = 0;
  let clock = 0;
  let ready = false;
  let lost = false;
  let ratio = 1;
  const losing = gl.getExtension('WEBGL_lose_context');

  const still = (): boolean => reducedMotion(host);
  const running = (): boolean => !lost && visible && !document.hidden && !still();

  const draw = (dt: number): void => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(at('u_res'), canvas.width, canvas.height);
    gl.uniform1f(at('u_t'), clock);
    gl.uniform1f(at('u_dpr'), ratio);
    shader.frame(gl, at, read, clock, dt);
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
    ratio = Math.min(window.devicePixelRatio || 1, 2);
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
    read = shader.read(getComputedStyle(host));
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
      if (losing !== null) {
        // cancelled, so the context may be restored if a run starts on this canvas again
        canvas.addEventListener('webglcontextlost', (event) => event.preventDefault(), {
          once: true,
        });
        released.set(canvas, losing);
        losing.loseContext();
      }
    },
  };
}

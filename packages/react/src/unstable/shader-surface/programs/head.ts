// What every ShaderSurface program starts with (D-dv): the uniforms the runtime and the variant's
// colours fill, the shared noise, a three-octave fbm and the grain. No directive.
import { GLSL_NOISE } from '../../../_internal/shader-canvas';

/** The uniforms (`u_c0` the ground, `u_c1` to `u_c3` the tones), noise, fbm and grain. */
export const HEAD: string = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_dpr;
uniform vec4 u_c0;
uniform vec4 u_c1;
uniform vec4 u_c2;
uniform vec4 u_c3;
uniform float u_dark;
${GLSL_NOISE}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
float grain(float amount) { return (hash(gl_FragCoord.xy + fract(u_t) * 13.0) - 0.5) * amount; }
`;

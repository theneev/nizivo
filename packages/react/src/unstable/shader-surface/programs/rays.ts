// ShaderSurface's rays program (D-dv), loaded only when a surface of this variant mounts.
// No directive.
import { HEAD } from './head';

/**
 * Rays (angle 18, width 1, intensity 1.2, speed 0.5, grain 0.025): about fifteen thin strands of
 * light, some in focus and some soft, leaning 18 degrees and waving. Tones: 1 the warm strands
 * (Figma's amber), 2 the lime ones, 3 the green ones.
 */
const RAYS: string = `${HEAD}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float aspect = u_res.x / u_res.y;
  float t = u_t * 0.5;
  float lean = 0.325;
  vec3 col = u_c0.rgb;
  for (int i = 0; i < 15; i++) {
    float fi = float(i);
    float seed = hash(vec2(fi, 3.7));
    float seed2 = hash(vec2(fi, 9.1));
    float base = -0.3 + (aspect + 0.3) * (fi + 0.5) / 15.0 + (seed - 0.5) * 0.18;
    float x0 = base + uv.y * lean
      + 0.07 * sin(uv.y * (2.0 + seed * 3.0) + t * (0.6 + seed) + seed * 6.2832);
    float w = 0.0012 + 0.005 * seed2;
    float blur = 0.002 + 0.022 * hash(vec2(fi, 1.3));
    float k = exp(-pow(abs(uv.x - x0) / (w + blur), 2.0));
    k *= 0.45 + 0.55 * smoothstep(0.0, 0.7, uv.y + 0.15 * uv.x);
    float which = mod(fi, 3.0);
    vec3 ray = which < 0.5 ? u_c3.rgb : (which < 1.5 ? u_c2.rgb : u_c1.rgb);
    col = mix(col, ray, clamp(k * 0.95 * (0.5 + 0.5 * seed), 0.0, 1.0));
  }
  gl_FragColor = vec4(col + grain(0.045), 1.0);
}`;

export default RAYS;

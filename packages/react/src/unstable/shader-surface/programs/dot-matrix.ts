// ShaderSurface's dot-matrix program (D-dv), loaded only when a surface of this variant mounts.
// No directive.
import { HEAD } from './head';

/**
 * Dot Matrix (cellSize 14, waveX 70, waveY 45, contrast 1.8, edgeFade 0.6, scale 1.4, speed 0.5): a
 * grid of dots on a dark ground, their size and light set by slow waves and two drifting blooms,
 * lime at the brightest, fading toward the edges. Tones: 1 the lower ground, 2 the brightest dots
 * (lime), 3 the dots.
 */
const DOT_MATRIX: string = `${HEAD}
void main() {
  float cell = 14.0 * u_dpr;
  vec2 px = gl_FragCoord.xy;
  vec2 centre = (floor(px / cell) + 0.5) * cell;
  vec2 uv = centre / u_res.y;
  float aspect = u_res.x / u_res.y;
  float t = u_t * 0.5;

  float wave = 0.5 + 0.25 * sin(centre.x / (70.0 * u_dpr) * 6.2832 * 0.25 + t)
    + 0.25 * sin(centre.y / (45.0 * u_dpr) * 6.2832 * 0.25 - t * 0.8);
  vec2 b1 = vec2(aspect * (0.72 + 0.08 * sin(t * 0.4)), 0.55 + 0.12 * cos(t * 0.33));
  vec2 b2 = vec2(aspect * (0.12 + 0.06 * cos(t * 0.3)), 0.25 + 0.1 * sin(t * 0.45));
  float bloom = exp(-dot(uv - b1, uv - b1) / 0.05) + 0.55 * exp(-dot(uv - b2, uv - b2) / 0.06);
  float v = clamp(pow(clamp(wave * 0.3 + bloom, 0.0, 1.0), 1.8 * 0.6), 0.0, 1.0);
  vec2 edge = min(centre, u_res - centre) / u_res.y;
  v *= mix(1.0, smoothstep(0.0, 0.3, min(edge.x, edge.y)), 0.6);

  float r = mix(0.1, 0.42, v) * cell;
  float dotMask = 1.0 - smoothstep(r - 1.0, r + 1.0, length(px - centre));
  vec3 ground = mix(u_c1.rgb, u_c0.rgb, gl_FragCoord.y / u_res.y);
  vec3 dots = mix(u_c3.rgb, u_c2.rgb, smoothstep(0.55, 0.95, v));
  vec3 col = mix(ground, dots, dotMask * (0.25 + 0.75 * v));
  gl_FragColor = vec4(col + grain(0.04), 1.0);
}`;

export default DOT_MATRIX;

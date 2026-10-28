// ShaderSurface's contour program (D-dv), loaded only when a surface of this variant mounts.
// No directive.
import { HEAD } from './head';

/**
 * Contour (density 16, lineWidth 0.6, scale 1.2, speed 0.3, tint 0.6, grain 0.025): the contour
 * lines of a slowly drifting height field, thin and pale, with one level in every six drawn bold.
 * Tones: 1 the lines, 2 the tint over high ground, 3 the bold lines.
 */
const CONTOUR: string = `${HEAD}
float height(vec2 q) { return fbm(q); }
void main() {
  float t = u_t * 0.3;
  float scale = 1.2 * 1.6;
  vec2 q = gl_FragCoord.xy / u_res.y * scale + vec2(t * 0.05, -t * 0.03);
  float onePx = scale / u_res.y;
  float h = height(q);
  float levels = h * 16.0;
  // the field's change per device pixel, so every line has the same width in pixels
  float perPx = length(vec2(height(q + vec2(onePx, 0.0)) - h, height(q + vec2(0.0, onePx)) - h)) * 16.0;
  float dpx = abs(fract(levels + 0.5) - 0.5) / max(perPx, 0.0001);
  float thin = 0.6 * u_dpr;
  float line = 1.0 - smoothstep(thin, thin + 1.0, dpx);
  float bold = step(abs(mod(floor(levels + 0.5), 6.0) - 3.0), 0.5);
  float wide = 1.0 * u_dpr;
  float boldLine = bold * (1.0 - smoothstep(wide, wide + 1.0, dpx));

  vec3 col = mix(u_c0.rgb, u_c2.rgb, smoothstep(0.55, 0.75, h) * 0.6);
  col = mix(col, u_c1.rgb, line);
  col = mix(col, u_c3.rgb, boldLine);
  gl_FragColor = vec4(col + grain(0.05), 1.0);
}`;

export default CONTOUR;

// ShaderSurface's mesh program (D-dv), loaded only when a surface of this variant mounts.
// No directive.
import { HEAD } from './head';

/**
 * Mesh (softness 1.4, speed 0.3, grain 0.03): a soft field of four colours drifting slowly: the
 * first tone at the top left, lime at the top right, green at the bottom left and the ground in the
 * middle and the lower right. Tones: 1 the mint, 2 the lime, 3 the green.
 */
const MESH: string = `${HEAD}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  float t = u_t * 0.3;
  vec2 a = vec2(0.12 + 0.08 * sin(t * 0.7), 0.82 + 0.06 * cos(t * 0.5));
  vec2 b = vec2(0.9 + 0.06 * cos(t * 0.6), 0.92 + 0.05 * sin(t * 0.8));
  vec2 c = vec2(0.1 + 0.06 * cos(t * 0.4), 0.0 + 0.05 * sin(t * 0.9));
  vec2 g = vec2(0.72 + 0.08 * sin(t * 0.5), 0.3 + 0.07 * cos(t * 0.7));
  vec2 k = vec2(aspect, 1.0);
  float soft = 0.11 * 1.4;
  float wa = exp(-dot((uv - a) * k, (uv - a) * k) / soft);
  float wb = exp(-dot((uv - b) * k, (uv - b) * k) / (soft * 0.8));
  float wc = exp(-dot((uv - c) * k, (uv - c) * k) / (soft * 0.55));
  float wg = exp(-dot((uv - g) * k, (uv - g) * k) / soft) + 0.08;
  vec3 col = (u_c1.rgb * wa + u_c2.rgb * wb + u_c3.rgb * wc + u_c0.rgb * wg) / (wa + wb + wc + wg);
  gl_FragColor = vec4(col + grain(0.05), 1.0);
}`;

export default MESH;

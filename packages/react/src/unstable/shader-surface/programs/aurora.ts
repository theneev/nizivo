// ShaderSurface's aurora program (D-dv), loaded only when a surface of this variant mounts.
// No directive.
import { HEAD } from './head';

/**
 * Aurora (curtains 0.7, light 0.5 or 0.2 dark, speed 0.4, grain 0.04): soft vertical curtains of
 * light that sway, over a ground running from pale at the top to the mid colour at the bottom.
 * Tones: 1 the mid colour (mint), 2 the curtains (lime), 3 the deep colour gathering low.
 */
const AURORA: string = `${HEAD}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float y = 1.0 - uv.y;
  float x = uv.x * u_res.x / u_res.y;
  float t = u_t * 0.4;
  float light = mix(0.5, 0.2, u_dark);

  vec3 col = mix(u_c0.rgb, u_c1.rgb, smoothstep(0.2, 1.0, y));
  float bend = fbm(vec2(x * 0.8 + t * 0.15, y * 0.9 - t * 0.1));
  float band = pow(0.5 + 0.5 * sin(x * 3.4 + bend * 2.6 + t * 0.25), 2.5);
  float each = smoothstep(0.25, 0.75, fbm(vec2(x * 1.3 - t * 0.12, 0.5 + t * 0.05)));
  float vertical = smoothstep(0.04, 0.3, y) * (1.0 - smoothstep(0.62, 0.98, y));
  float curtain = clamp(band * (0.3 + 0.7 * each) * vertical * 0.7 * 1.9, 0.0, 1.0);
  col = mix(col, u_c2.rgb, curtain);
  float deep = smoothstep(0.55, 1.0, y) * (0.4 + 0.6 * fbm(vec2(x * 0.9 + t * 0.1, 3.0)));
  col = mix(col, u_c3.rgb, deep * (1.0 - light) * 0.6);
  col += (1.0 - y) * 0.04 * light;
  gl_FragColor = vec4(col + grain(0.07), 1.0);
}`;

export default AURORA;

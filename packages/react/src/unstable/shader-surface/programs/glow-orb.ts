// ShaderSurface's glow-orb program (D-dv), loaded only when a surface of this variant mounts.
// No directive.
import { GLSL_ORB } from '../../glow-orb/glow-orb-gl';
import { HEAD } from './head';

/**
 * Glow Orb (radius 34, x 50, y 50, halo 0.8, speed 0.6, grain 0.035): GlowOrb's sphere, centred, in
 * a glow that spreads over the ground. Tones: 1 the glow, 2 the sphere's light side, 3 its deep side.
 */
const GLOW_ORB: string = `${HEAD}
${GLSL_ORB}
void main() {
  float s = 0.5 * min(u_res.x, u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / s;
  float d = length(p);
  vec3 ground = mix(u_c0.rgb, u_c1.rgb, exp(-d * d / 1.6) * 0.8);
  vec4 orb = glowOrb(p, 1.6 / s, u_t, 0.0, 0.0, u_c2.rgb, u_c3.rgb, vec4(u_c1.rgb, 0.8), 0.0);
  gl_FragColor = vec4(orb.rgb + ground * (1.0 - orb.a) + grain(0.06), 1.0);
}`;

export default GLOW_ORB;

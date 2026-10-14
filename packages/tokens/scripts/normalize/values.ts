// Value conversions from TokensBrücke's DTCG output to the shapes src/figma-owned uses.
import { isRecord } from '../figma/snapshot.ts';
import type { Group, Json } from './json.ts';

/** Dimensions are emitted in rem so user font scaling works (plan §7.2). */
const REM_PX = 16;

export const round = (value: number, digits = 4): number => Number(value.toFixed(digits));

/** TokensBrücke exports every Figma FLOAT as `{ value, unit: 'px' }`; this reads the number. */
export function px(raw: unknown, where: string): number {
  if (isRecord(raw) && raw.unit === 'px' && typeof raw.value === 'number') return raw.value;
  throw new Error(`${where}: expected a px dimension, got ${JSON.stringify(raw)}`);
}

export const rem = (pixels: number): Group => ({ value: round(pixels / REM_PX, 6), unit: 'rem' });
export const pixels = (value: number): Group => ({ value, unit: 'px' });

/** How a Figma FLOAT becomes a DTCG token. Figma has no unit, so the group decides. */
export type FloatRule = 'rem' | 'px' | 'ms' | 'number';

const FLOAT: Record<FloatRule, (value: number) => { $type: string; $value: Json }> = {
  rem: (value) => ({ $type: 'dimension', $value: rem(value) }),
  px: (value) => ({ $type: 'dimension', $value: pixels(value) }),
  ms: (value) => ({ $type: 'duration', $value: { value, unit: 'ms' } }),
  number: (value) => ({ $type: 'number', $value: value }),
};

export const float = (rule: FloatRule, value: number): { $type: string; $value: Json } =>
  FLOAT[rule](value);

/** An sRGB colour. `hex` is cut to 6 digits: DTCG keeps alpha in `alpha`, not in the hex. */
export function color(raw: unknown, where: string): Group {
  const components = isRecord(raw) ? raw.components : undefined;
  if (
    !isRecord(raw) ||
    raw.colorSpace !== 'srgb' ||
    !Array.isArray(components) ||
    components.length !== 3 ||
    !components.every((c) => typeof c === 'number')
  ) {
    throw new Error(`${where}: expected an sRGB colour object, got ${JSON.stringify(raw)}`);
  }
  const value: Group = {
    colorSpace: 'srgb',
    components,
    alpha: typeof raw.alpha === 'number' ? raw.alpha : 1,
  };
  if (typeof raw.hex === 'string') value.hex = raw.hex.slice(0, 7).toLowerCase();
  return value;
}

export interface Spring {
  mass: number;
  stiffness: number;
  damping: number;
  velocity: number;
}

/**
 * Cubic stand-in for tools that ignore `dev.nizivo.spring` (r7 §7.2). CSS never uses it: the one
 * spring generator (tooling/spring, plan §13.1) turns the extension into `linear()`.
 */
export const SPRING_FALLBACK: number[] = [0.3, 0, 0, 1];

const numbers = (list: string): number[] => list.split(',').map((part) => Number(part.trim()));

/** `cubic-bezier(…)`, `linear` or Figma's `spring(mass, stiffness, damping, velocity)`. */
export function easing(raw: unknown, where: string): { $value: number[]; spring?: Spring } {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === 'linear') return { $value: [0, 0, 1, 1] };
  const cubic = /^cubic-bezier\(([^)]*)\)$/.exec(text)?.[1];
  const spring = /^spring\(([^)]*)\)$/.exec(text)?.[1];
  const args = numbers(cubic ?? spring ?? '');
  if (args.length === 4 && args.every(Number.isFinite)) {
    const [a = 0, b = 0, c = 0, d = 0] = args;
    // The order (mass, stiffness, damping, velocity) is assumed until design confirms it (§13.1).
    if (spring !== undefined) {
      return {
        $value: SPRING_FALLBACK,
        spring: { mass: a, stiffness: b, damping: c, velocity: d },
      };
    }
    return { $value: [a, b, c, d] };
  }
  throw new Error(`${where}: unsupported easing ${JSON.stringify(raw)}`);
}

/** `"104%"` → 104. TokensBrücke writes Figma's PERCENT line heights and tracking this way. */
export function percent(raw: unknown, where: string): number {
  const match = typeof raw === 'string' ? /^(-?\d+(?:\.\d+)?(?:e-?\d+)?)%$/.exec(raw) : null;
  if (match?.[1] === undefined) {
    throw new Error(`${where}: expected a percentage, got ${JSON.stringify(raw)}`);
  }
  return Number(match[1]);
}

// Fixture: core maths that no subpath folder holds, documented by the barrel.
export type { CurveFactory } from 'd3-shape';

/** A scale: called with a value, it returns a position. */
export interface ScaleLike<D> {
  (value: D): number | undefined;
  domain(): D[];
}

/** A linear scale. */
export function linear(domain: readonly [number, number]): ScaleLike<number> {
  const [from, to] = domain;
  return Object.assign((value: number) => (value - from) / (to - from), {
    domain: () => [from, to],
  });
}

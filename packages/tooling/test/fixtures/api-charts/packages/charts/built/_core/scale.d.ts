import { CurveFactory, CurveFactory as CurveFactory$1 } from 'd3-shape';
//#region src/_core/scale.d.ts
/** A scale: called with a value, it returns a position. */
export interface ScaleLike<D> {
  (value: D): number | undefined;
  domain(): D[];
}
/** A linear scale. */
export declare function linear(domain: readonly [number, number]): ScaleLike<number>;
//#endregion
export { type CurveFactory$1 as CurveFactory };

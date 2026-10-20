// Fixture: the barrel re-exports each part with `export *`, and _core by name.
export * from './frame/index';
export * from './spark/index';
export { linear } from './_core/scale';
export type { CurveFactory, ScaleLike } from './_core/scale';

// @nizivo/charts: a pure re-export barrel, no directive (ARCHITECTURE.md §5.2, §14.1). Every part
// is also its own subpath (`@nizivo/charts/chart-frame`) except AreaChart, which is barrel-only
// until its size figure is decided (D-bc); the core maths is public here so a custom renderer
// inside <ChartFrame> computes positions the way Nizivo's do.
export * from './chart-frame/index';
export * from './legend/index';
export * from './area-chart/index';
export * from './bar-chart/index';
export * from './chart-tooltip/index';
export * from './donut-chart/index';
export * from './sparkline/index';
export { band, linear, point, valueDomain } from './_core/scale';
export type {
  BandOptions,
  BandScale,
  BandScaleLike,
  LinearScale,
  LinearScaleLike,
  PointOptions,
  PointScale,
  PointScaleLike,
  ScaleLike,
  ValueDomainOptions,
} from './_core/scale';
export {
  dateTicks,
  everyNth,
  isPlainDate,
  plainDateFormat,
  plainDateValue,
  tickEvery,
  tickLabels,
} from './_core/time-ticks';
export type { DateTicksOptions, EveryNthOptions, PlainDate } from './_core/time-ticks';

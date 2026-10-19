// NO directive and no island: Sparkline is a server-rendered inline trend (Figma 03 "Sparkline",
// 7275:13323; the KPI tile's chart slot, 04). Decorative by default, inside a labelled context such
// as a KPI tile whose Delta carries the meaning: the whole mark is aria-hidden. Named (`label`, or
// the consumer's own aria-label or aria-labelledby) it is one image with that name; an empty name
// is no name, so `label=""` stays decorative. The trend is derived from the data, never a prop: up and flat draw in
// chart/primary, down in chart/neutral (Figma's "down ≠ bad" convention, 03 §4.3).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { curveMonotoneX, type CurveFactory } from 'd3-shape';
import { VIEWBOX } from '../_core/geometry';
import { areaPath, dotPath, linePath, type PathPoint } from '../_core/path';
import { cx } from '../_shared/cx';
import type { ChartTrend } from '../chart-tooltip/chart-tooltip';

export interface SparklineProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** The values in order; `null` leaves a gap. Evenly spaced along x. */
  data: ReadonlyArray<number | null | undefined>;
  /**
   * An accessible name ("Sales, up 28% over 30 days"): the sparkline becomes one image. `aria-label`
   * or `aria-labelledby` do the same; without a name it is decorative (aria-hidden).
   */
  label?: string;
  /** Any d3-shape curve factory. @default curveMonotoneX */
  curve?: CurveFactory;
  /** The 10% wash under the line. @default true */
  area?: boolean;
  /** The last value's dot. @default true */
  dot?: boolean;
}

/** The line's lowest point, in percent of the plot, so the wash shows under it (Figma: 28 of 32 px). */
const FLOOR = 85;

export function Sparkline({
  data,
  label,
  curve = curveMonotoneX,
  area = true,
  dot = true,
  className,
  ...rest
}: SparklineProps): ReactElement {
  const values = data.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null));
  const defined = values.filter((v) => v !== null);
  const lo = Math.min(...defined);
  const hi = Math.max(...defined);
  const first = defined[0];
  const last = defined.at(-1);
  const trend: ChartTrend | undefined =
    first === undefined || last === undefined
      ? undefined
      : last > first
        ? 'up'
        : last < first
          ? 'down'
          : 'flat';
  const n = values.length;
  const points: PathPoint[] = values.map((v, i) =>
    v === null
      ? null
      : [
          n === 1 ? 50 : (i / (n - 1)) * 100,
          hi === lo ? FLOOR / 2 : ((hi - v) / (hi - lo)) * FLOOR,
        ],
  );
  const end = points.findLast((p) => p !== null);
  const named = Boolean(label || rest['aria-label'] || rest['aria-labelledby']);
  return (
    <span
      data-slot="sparkline"
      {...(named ? { role: 'img', 'aria-label': label || undefined } : { 'aria-hidden': true })}
      {...rest}
      className={cx('nz-sparkline', className)}
      data-trend={trend}
    >
      <svg className="nz-chart-svg" viewBox={VIEWBOX} preserveAspectRatio="none" aria-hidden="true">
        {area && <path className="nz-chart-area" d={areaPath(points, 100, curve)} />}
        <path className="nz-chart-line" d={linePath(points, curve)} />
        {dot && end != null && (
          <>
            <path className="nz-sparkline-halo" d={dotPath(...end)} />
            <path className="nz-sparkline-dot" d={dotPath(...end)} />
          </>
        )}
      </svg>
    </span>
  );
}

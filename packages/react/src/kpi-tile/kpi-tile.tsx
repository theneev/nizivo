// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5, §10.7). Figma KPI Tile 7275:13780:
// Card's surface (padding sm = 20, radius xl, no shadow at rest: decision 8j, handoff row j) around a
// Metric, with the chart through an element slot (core never imports @nizivo/charts). Figma's four
// variants map to `tone`, DECOUPLED from the trend (M41 item 3; figma/04 §4.3): Surface × Up and
// Surface × Down → 'surface'; Tinted × Up (bg/brand-subtle) → 'brand'; Tinted × Down
// (bg/accent-subtle) → 'accent'. The trend is the sign of `delta`.
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { dataStatusAttrs, type DataStatus } from '../_internal/data-status';
import { Metric, resolveStatus, type MetricDataProps } from '../metric/metric';

/** The tile's surface: `surface`, or tinted as `brand` or `accent` (Card's tones of the same names). */
export type KpiTileTone = 'surface' | 'brand' | 'accent';

export interface KpiTileState {
  /** The status as rendered: `'empty'` when a ready tile has no value. */
  status: DataStatus;
  pending: boolean;
  tone: KpiTileTone;
}

export interface KpiTileProps
  extends MetricDataProps, Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The surface; group a row of related KPIs with one tint. @default 'surface' */
  tone?: KpiTileTone;
  /**
   * A small chart beside the value, shown while ready, for example
   * `<Sparkline data={series} label="Sales, last 7 days" />` from `@nizivo/charts`. Drawn at most
   * 88 × 28 px.
   */
  chart?: ReactNode;
  render?: RenderProp<KpiTileState>;
}

/**
 * One number, its change and its shape. A `role="group"` named by the label (not a landmark). The
 * Suspense fallback is the same tile with `status="loading"`: the box does not change (§16.5).
 */
export function KpiTile({
  label,
  value,
  format,
  locale,
  delta,
  comparison,
  chart,
  tone = 'surface',
  status = 'ready',
  pending = false,
  empty,
  error,
  labels,
  render,
  className,
  ...rest
}: KpiTileProps): ReactElement {
  const labelId = useId();
  const st = resolveStatus(status, value);
  const busy = st === 'ready' && pending;
  return renderElement(
    'div',
    render,
    { status: st, pending: busy, tone },
    {
      // Card's surface by its class and attributes (card.css): tone, padding sm, no elevation
      'data-slot': 'kpi-tile',
      'data-tone': tone,
      'data-padding': 'sm',
      ...dataStatusAttrs(st, busy),
      role: 'group',
      'aria-labelledby': labelId,
      ...rest,
      className: cx('nz-card', 'nz-kpi-tile', className),
      children: (
        <Metric
          labelId={labelId}
          label={label}
          value={value}
          format={format}
          locale={locale}
          delta={delta}
          comparison={comparison}
          chart={chart}
          status={status}
          pending={pending}
          empty={empty}
          error={error}
          labels={labels}
          reserveChange
        />
      ),
    },
  );
}

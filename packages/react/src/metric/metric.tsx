// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). The "label + number + delta +
// comparison" block Figma draws twice, in the KPI Tile (7275:13783: gaps 16 and 8, Numeric/KPI) and in
// the Revenue Card headline (I7275:13818;752:387: gaps 8 and 12, Numeric/Display, the delta beside the
// number). One export ends that drift (component-inventory "Metric, NumberValue"). It takes the §16.5
// status contract: the box keeps its size in every status, so a Suspense fallback causes no shift.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { dataStatusAttrs, type DataStatus } from '../_internal/data-status';
import { Delta } from '../delta/delta';
import { InlineError } from '../inline-error/inline-error';
import { NumberValue } from '../number-value/number-value';
import { Skeleton } from '../skeleton/skeleton';

/** `default`: Numeric/KPI, the change on its own row (KPI Tile). `display`: Numeric/Display, the change beside the number (Revenue Card). */
export type MetricSize = 'default' | 'display';

/**
 * Strings Metric renders (§16.4), all visually hidden or replaceable by a slot. `{label}` is replaced
 * by the `label` prop.
 */
export interface MetricLabels {
  /** Static text while `status="loading"` (§16.5: `aria-busy` plus this, no live region). @default 'Loading {label}' */
  loading: string;
  /** Read after the "—" when there is no value and no `empty` slot. @default 'No data' */
  empty: string;
  /** The InlineError message when loading failed and there is no `error` slot. @default 'Could not load {label}' */
  error: string;
}

/** English defaults of Metric's strings; KpiTile and TrendCard use them too. */
export const metricLabels: MetricLabels = {
  loading: 'Loading {label}',
  empty: 'No data',
  error: 'Could not load {label}',
};

export interface MetricState {
  /** The status as rendered: `'empty'` when a ready metric has no value. */
  status: DataStatus;
  pending: boolean;
  size: MetricSize;
}

/** The value and status props Metric, KpiTile and TrendCard share. */
export interface MetricDataProps {
  /** The name of the number, for example "Total sales". Also names the status texts. */
  label: ReactNode;
  /** The number. `null` or `undefined` (or `NaN`) with `status="ready"` renders the empty state. */
  value?: number | null | undefined;
  /** `Intl.NumberFormat` options for the value. @default {} */
  format?: Intl.NumberFormatOptions | undefined;
  /** BCP 47 tag for the value and a numeric `delta`. @default 'en-US' */
  locale?: string | undefined;
  /**
   * The change. A number renders `<Delta value={delta} locale={locale} />` (a fraction: `0.124` is
   * "+12.4%"); pass your own `<Delta … />` element for another format, a tone or an icon.
   */
  delta?: number | ReactElement | undefined;
  /** Visible text after the delta, for example "vs last week". */
  comparison?: ReactNode | undefined;
  /** §16.5 lifecycle. @default 'ready' */
  status?: DataStatus | undefined;
  /** A refresh is in flight while the value shows: `data-pending` and `aria-busy`. */
  pending?: boolean | undefined;
  /** Replaces the "—" of the empty state. */
  empty?: ReactNode | undefined;
  /** Replaces the InlineError of the error state, for example one with a Retry `action`. */
  error?: ReactNode | undefined;
  labels?: Partial<MetricLabels> | undefined;
}

export interface MetricProps
  extends MetricDataProps, Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** @default 'default' */
  size?: MetricSize;
  /**
   * A small chart at the end of the value row, for example a Sparkline; shown while ready. Its box is
   * at most the row's (KpiTile draws it at 88 × 28, Figma's tile).
   */
  chart?: ReactNode;
  /** The id of the label element, for an enclosing group's `aria-labelledby` (KpiTile sets it). */
  labelId?: string;
  /**
   * Keep the change row's height when there is no `delta` and no `comparison`, so the box is the same
   * whatever a fallback passes (KpiTile and TrendCard set it: Figma's tile and card always have it).
   */
  reserveChange?: boolean;
  render?: RenderProp<MetricState>;
}

/** `template` with its `{label}` replaced by the label node (which may be an element). */
export function fillLabel(template: string, label: ReactNode): ReactNode {
  const at = template.indexOf('{label}');
  if (at < 0) return template;
  return (
    <>
      {template.slice(0, at)}
      {label}
      {template.slice(at + '{label}'.length)}
    </>
  );
}

/** The status Metric renders: a ready metric without a finite-or-infinite number is empty. */
export function resolveStatus(status: DataStatus, value: number | null | undefined): DataStatus {
  return status === 'ready' && (value == null || Number.isNaN(value)) ? 'empty' : status;
}

export function Metric({
  label,
  value,
  format,
  locale = 'en-US',
  delta,
  comparison,
  status = 'ready',
  pending = false,
  empty,
  error,
  labels,
  size = 'default',
  chart,
  labelId,
  reserveChange = false,
  render,
  className,
  ...rest
}: MetricProps): ReactElement {
  const L: MetricLabels = { ...metricLabels, ...labels };
  const st = resolveStatus(status, value);
  const ready = st === 'ready';
  const busy = ready && pending;

  let shown: ReactNode;
  if (st === 'loading') {
    shown = (
      <>
        <Skeleton shape="block" className="nz-metric-value-skeleton" />
        <span className="nz-visually-hidden">{fillLabel(L.loading, label)}</span>
      </>
    );
  } else if (st === 'error') {
    shown = error ?? <InlineError>{fillLabel(L.error, label)}</InlineError>;
  } else if (st === 'empty') {
    shown = empty ?? (
      <span className="nz-metric-empty" data-slot="metric-empty">
        <span aria-hidden="true">—</span>
        <span className="nz-visually-hidden">{fillLabel(L.empty, label)}</span>
      </span>
    );
  } else {
    shown = (
      <NumberValue className="nz-metric-value" value={value ?? 0} format={format} locale={locale} />
    );
  }

  const hasChange = delta !== undefined || comparison != null;
  let change: ReactNode;
  if (hasChange || reserveChange) {
    change = (
      <div className="nz-metric-change" data-slot="metric-change">
        {st === 'loading' && hasChange ? (
          <Skeleton shape="block" className="nz-metric-change-skeleton" />
        ) : (
          ready && (
            <>
              {typeof delta === 'number' ? <Delta value={delta} locale={locale} /> : delta}
              {comparison != null && (
                <span className="nz-metric-comparison" data-slot="metric-comparison">
                  {comparison}
                </span>
              )}
            </>
          )
        )}
      </div>
    );
  }

  return renderElement(
    'div',
    render,
    { status: st, pending: busy, size },
    {
      'data-slot': 'metric',
      'data-size': size,
      ...dataStatusAttrs(st, busy),
      ...rest,
      className: cx('nz-metric', className),
      children: (
        <>
          <div className="nz-metric-label" data-slot="metric-label" id={labelId}>
            {label}
          </div>
          <div className="nz-metric-value-row" data-slot="metric-value-row">
            {shown}
            {size === 'display' && change}
            {chart != null && ready && (
              <div className="nz-metric-chart" data-slot="metric-chart">
                {chart}
              </div>
            )}
          </div>
          {size === 'default' && change}
        </>
      ),
    },
  );
}

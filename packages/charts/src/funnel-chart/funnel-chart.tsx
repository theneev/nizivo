// NO directive: FunnelChart renders its whole picture on the server, with no client JavaScript
// (ARCHITECTURE.md §14.1; Figma 03 "Funnel Chart", 751:319). Steps in order, each a row: its name, a
// bar on a track as long as its share of the first step, its count, and its share of the step
// before ("—" on the first). The values are text, not only bar lengths (Figma). The rows are drawn
// for the eye and hidden from assistive technology, which reads the frame's data table instead:
// step, count and % of previous (Figma: "expose as a list or table"). A bar's length is an SVG
// attribute, never an inline style (CSP Profile B). It makes no keyboard claim: there is nothing to
// rove, every value is already text.
import type { ReactElement } from 'react';
import {
  accessor,
  finite,
  INTL_DEFAULT,
  type Accessor,
  type ChartFramePassthrough,
} from '../_core/api';
import { num } from '../_core/geometry';
import { cx } from '../_shared/cx';
import { ChartFrame, chartFrameLabels } from '../chart-frame/chart-frame';
import type { ChartFrameLabels } from '../chart-frame/chart-frame.contract';

/** FunnelChart's strings (§16.4), with ChartFrame's. Never concatenated: each is a whole label. */
export interface FunnelChartLabels extends ChartFrameLabels {
  /** The data table's first column header. */
  step: string;
  /** The data table's count column. */
  value: string;
  /** The data table's share column. */
  share: string;
  /** In place of the first step's share, which has no step before it. */
  noShare: string;
}

/** English defaults (§16.4); pass `labels` to translate per instance. */
export const funnelChartLabels: FunnelChartLabels = {
  ...chartFrameLabels,
  step: 'Step',
  value: 'Count',
  share: '% of previous',
  noShare: '—',
};

/** One step, measured. */
export interface FunnelStep {
  label: string;
  value: number;
  /** Its value over the first step's, 0 to 1: the bar's length. */
  ofFirst: number;
  /** Its value over the previous step's, or `null` on the first step (and after a zero step). */
  ofPrevious: number | null;
}

/**
 * The steps in input order, with a value that is not a finite number taken as 0; negative values
 * are 0 too. `ofFirst` is clamped to 0–1 (a later step larger than the first draws a full bar),
 * and is 0 throughout when the first step is 0.
 */
export function funnelSteps(items: ReadonlyArray<{ label: string; value: number }>): FunnelStep[] {
  const first = Math.max(0, items[0]?.value ?? 0);
  return items.map((item, i) => {
    const value = Number.isFinite(item.value) ? Math.max(0, item.value) : 0;
    const previous = i === 0 ? 0 : Math.max(0, items[i - 1]?.value ?? 0);
    return {
      label: item.label,
      value,
      ofFirst: first > 0 ? Math.min(1, value / first) : 0,
      ofPrevious: i > 0 && previous > 0 ? value / previous : null,
    };
  });
}

const SHARE: Intl.NumberFormatOptions = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

/**
 * FunnelChart's props: its data and formats in the charts' one shape (`_core/api.ts`) and
 * ChartFrame's, the `<figure>`'s attributes included. It draws no axes and no legend, is never
 * mirrored and makes no keyboard claim, so `axes`, `legend`, `xDirection` and `interaction` are its
 * own.
 */
export interface FunnelChartProps<T> extends ChartFramePassthrough<
  'axes' | 'legend' | 'xDirection' | 'interaction'
> {
  /** One datum per step, in funnel order. */
  data: readonly T[];
  /** The step's name: a key of the datum, or a `(datum, index)` function. */
  step: Accessor<T, string>;
  /** How many reached it; one that is not a finite number counts as 0. */
  value: Accessor<T, number | null | undefined>;
  /** BCP 47 locale every number is formatted in, once, on the server (§16.4). @default 'en-US' */
  locale?: string;
  /** Counts. @default Intl.NumberFormat's own ({}) */
  format?: Intl.NumberFormatOptions;
  /** Shares of the previous step. @default { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 } */
  shareFormat?: Intl.NumberFormatOptions;
  labels?: Partial<FunnelChartLabels>;
}

export function FunnelChart<T>({
  data,
  step,
  value,
  locale = 'en-US',
  format = INTL_DEFAULT,
  shareFormat = SHARE,
  status = 'ready',
  labels,
  title,
  className,
  ...frame
}: FunnelChartProps<T>): ReactElement {
  const L: FunnelChartLabels = { ...funnelChartLabels, ...labels };
  const labelOf = accessor(step);
  const valueOf = accessor(value);
  const steps = funnelSteps(
    data.map((datum, i) => ({
      label: labelOf(datum, i),
      value: finite(valueOf(datum, i)) ?? 0,
    })),
  );
  const count = new Intl.NumberFormat(locale, format);
  const share = new Intl.NumberFormat(locale, shareFormat);
  const rows = steps.map((s) => ({
    label: s.label,
    ofFirst: s.ofFirst,
    count: count.format(s.value),
    share: s.ofPrevious === null ? L.noShare : share.format(s.ofPrevious),
  }));

  return (
    <ChartFrame
      {...frame}
      className={cx('nz-funnel-chart', className)}
      title={title}
      labels={L}
      axes="none"
      interaction="none"
      table={{
        columns: [L.step, L.value, L.share],
        rows: rows.map((row) => [row.label, row.count, row.share]),
      }}
      status={status}
    >
      <ol className="nz-funnel-chart-steps" aria-hidden="true">
        {rows.map((row, i) => (
          // steps may share a name; the position keeps the key unique
          // oxlint-disable-next-line react/no-array-index-key
          <li key={i} className="nz-funnel-chart-step" data-slot="funnel-chart-step">
            <span className="nz-funnel-chart-label">{row.label}</span>
            <svg className="nz-funnel-chart-track" data-slot="funnel-chart-track">
              {/* rx 8: Figma's radius/sm, an attribute so every engine rounds it (8 px: no viewBox) */}
              <rect className="nz-funnel-chart-track-fill" width="100%" height="100%" rx="8" />
              {row.ofFirst > 0 && (
                <rect
                  className="nz-funnel-chart-bar"
                  data-slot="funnel-chart-bar"
                  width={`${num(row.ofFirst * 100, 2)}%`}
                  height="100%"
                  rx="8"
                />
              )}
            </svg>
            <span className="nz-funnel-chart-value">{row.count}</span>
            <span className="nz-funnel-chart-share">{row.share}</span>
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}

// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5). Geometry is SVG presentation
// attributes on a 72-unit viewBox (Figma's ring at 72 px), never an inline style (§19.3).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export type ProgressRingTone = 'brand' | 'success' | 'warning' | 'critical' | 'neutral';
/** 48 / 72 / 96 px. */
export type ProgressRingSize = 'sm' | 'md' | 'lg';

export interface ProgressRingState {
  tone: ProgressRingTone;
  size: ProgressRingSize;
  /** The value clamped to `0…max`. */
  value: number;
  max: number;
}

export interface ProgressRingProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** The progress so far. Clamped to `0…max`. */
  value: number;
  /** Must be above zero. @default 100 */
  max?: number;
  /** @default 'brand' */
  tone?: ProgressRingTone;
  /** @default 'md' */
  size?: ProgressRingSize;
  /**
   * Exposes the ring as a `meter` (a measurement, such as a goal reached) instead of a `progressbar`
   * (work under way). @default false
   */
  meter?: boolean;
  /** BCP 47 tag for the percentage. @default 'en-US' */
  locale?: string;
  /** What assistive technology reads instead of the percentage. Set it whenever `children` shows something else. */
  valueText?: string;
  /** The centre, shown to sighted users only (the ring's children are presentational). @default the percentage */
  children?: ReactNode;
  /** Name the ring with `aria-label` or `aria-labelledby`. */
  render?: RenderProp<ProgressRingState>;
}

const CENTRE = 36;
/** Figma's inner-radius ratio 0.8 at 72 px: a 7.2-unit ring on the 32.4 radius midline. */
const STROKE = 7.2;
const RADIUS = CENTRE - STROKE / 2;

export function ProgressRing({
  value,
  max = 100,
  tone = 'brand',
  size = 'md',
  meter = false,
  locale = 'en-US',
  valueText,
  render,
  className,
  children,
  ...rest
}: ProgressRingProps): ReactElement {
  const range = Number.isFinite(max) && max > 0 ? max : 100;
  const current = Number.isFinite(value) ? Math.min(Math.max(value, 0), range) : 0;
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(current / range);
  const arc = (current / range) * 100;
  return renderElement(
    'div',
    render,
    { tone, size, value: current, max: range },
    {
      role: meter ? 'meter' : 'progressbar',
      'aria-valuenow': current,
      'aria-valuemin': 0,
      'aria-valuemax': range,
      'aria-valuetext': valueText ?? percent,
      'data-slot': 'progress-ring',
      'data-tone': tone,
      'data-size': size,
      ...rest,
      className: cx('nz-progress-ring', className),
      children: (
        <>
          <svg
            className="nz-progress-ring-svg"
            viewBox={`0 0 ${CENTRE * 2} ${CENTRE * 2}`}
            aria-hidden="true"
            focusable="false"
          >
            <circle
              className="nz-progress-ring-track"
              data-slot="progress-ring-track"
              cx={CENTRE}
              cy={CENTRE}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
            />
            <circle
              className="nz-progress-ring-fill"
              data-slot="progress-ring-fill"
              cx={CENTRE}
              cy={CENTRE}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              pathLength={100}
              strokeDasharray={`${arc} 100`}
              transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
            />
          </svg>
          <span
            className="nz-progress-ring-label"
            data-slot="progress-ring-label"
            aria-hidden="true"
          >
            {children ?? percent}
          </span>
        </>
      ),
    },
  );
}

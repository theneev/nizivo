// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** The direction of the change, derived from the sign of `value`. */
export type DeltaTrend = 'up' | 'down' | 'flat';
/** The colour: up is `success`, down is `critical`, flat is `neutral` unless `tone` says otherwise. */
export type DeltaTone = 'success' | 'critical' | 'neutral';

export interface DeltaState {
  trend: DeltaTrend;
  tone: DeltaTone;
}

export interface DeltaProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** The change. With the default percent format it is a fraction: `0.124` renders "+12.4%". */
  value: number;
  /**
   * Replaces the default `{ style: 'percent', maximumFractionDigits: 1 }`. `signDisplay` stays
   * `'exceptZero'` unless you set it: the sign tells the direction without colour, so if you hide it,
   * say the direction in `comparison`.
   */
  format?: Intl.NumberFormatOptions;
  /** BCP 47 tag for the number. @default 'en-US' */
  locale?: string;
  /** Visually hidden phrase read after the value, for example "vs last week". */
  comparison?: string;
  /** Overrides the colour derived from the sign, for example `critical` when a rise is bad. */
  tone?: DeltaTone;
  /** Decorative leading glyph; choose it from the sign, for example `<TrendingUp />`. */
  icon?: ReactNode;
  render?: RenderProp<DeltaState>;
}

const DEFAULT_FORMAT: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 1 };

const TONES: Record<DeltaTrend, DeltaTone> = { up: 'success', down: 'critical', flat: 'neutral' };

export function Delta({
  value,
  format,
  locale = 'en-US',
  comparison,
  tone,
  icon,
  render,
  className,
  ...rest
}: DeltaProps): ReactElement {
  const trend: DeltaTrend = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const resolved = tone ?? TONES[trend];
  const options: Intl.NumberFormatOptions = {
    signDisplay: 'exceptZero',
    ...(format ?? DEFAULT_FORMAT),
  };
  const text = new Intl.NumberFormat(locale, options).format(value);
  return renderElement(
    'span',
    render,
    { trend, tone: resolved },
    {
      'data-slot': 'delta',
      'data-tone': resolved,
      ...rest,
      className: cx('nz-delta', className),
      children: (
        <>
          {icon != null && (
            <span className="nz-delta-icon" data-slot="delta-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="nz-delta-value" data-slot="delta-value">
            {text}
          </span>
          {comparison !== undefined && (
            <span className="nz-visually-hidden">{` ${comparison}`}</span>
          )}
        </>
      ),
    },
  );
}

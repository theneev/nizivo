// NO directive: PageIndicator is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.3; Figma's media
// pager dots 7275:20313 and fraction chip 7275:21014, docs/figma/10). It shows where a carousel or
// an onboarding sequence is, as dots or as "1 / 4". The visual is decorative (`aria-hidden`); a
// visually hidden "1 of 4" says the same to a screen reader, so the component works beside any
// carousel, which owns the controls. `tone="media"` sits on a photo: until design adds on-media
// tokens it uses `bg/code` and `text/on-dark`, as the storefront patterns do (M57, D-co).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { formatLabel } from '../i18n/format-label';

/** PageIndicator's own strings (§16.4): serialisable, English defaults. */
export interface PageIndicatorLabels {
  /**
   * The position, read by a screen reader instead of the visual: `{current}` and `{count}`.
   * @default '{current} of {count}'
   */
  position: string;
}

export interface PageIndicatorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** How many pages, slides or photos there are. */
  count: number;
  /** The one shown now, from 1. */
  current: number;
  /** Dots, one per page, or a "1 / 4" chip for longer sets. @default 'dots' */
  variant?: 'dots' | 'fraction';
  /** `'media'` over a photo or video; `'surface'` on the page. @default 'surface' */
  tone?: 'surface' | 'media';
  /** BCP 47 tag for the numbers. @default 'en-US' */
  locale?: string;
  /** Overrides the screen-reader position, for example `labels={{ position: 'Foto {current} von {count}' }}`. */
  labels?: Partial<PageIndicatorLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function PageIndicator({
  count,
  current,
  variant = 'dots',
  tone = 'surface',
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: PageIndicatorProps): ReactElement {
  const total = Math.max(1, Math.floor(count));
  const at = Math.min(total, Math.max(1, Math.floor(current)));
  const number = new Intl.NumberFormat(locale);
  const position = formatLabel(
    labels?.position ?? '{current} of {count}',
    { current: at, count: total },
    locale,
  );
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'page-indicator',
      'data-variant': variant,
      'data-tone': tone,
      ...rest,
      className: cx('nz-page-indicator', className),
      children: (
        <>
          <span className="nz-visually-hidden">{position}</span>
          {variant === 'fraction' ? (
            <span
              className="nz-page-indicator-fraction"
              data-slot="page-indicator-fraction"
              aria-hidden="true"
            >
              {number.format(at)} / {number.format(total)}
            </span>
          ) : (
            <span
              className="nz-page-indicator-dots"
              data-slot="page-indicator-dots"
              aria-hidden="true"
            >
              {Array.from({ length: total }, (_, index) => (
                <span
                  // the dots are positions, never reordered
                  key={index}
                  className="nz-page-indicator-dot"
                  data-slot="page-indicator-dot"
                  data-selected={index + 1 === at ? '' : undefined}
                />
              ))}
            </span>
          )}
        </>
      ),
    },
  );
}

// NO directive: Rating is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's
// Rating 7396:158). A read-only score: five stars, the score written out ("4.8") and the count
// ("(1,208 reviews)"). The stars are decoration; the whole is one image named in words ("Rated 4.8
// out of 5 from 1,208 reviews"). A star fills for each whole point, as Figma draws 4.8.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { StarGlyph } from '../../_internal/glyphs';
import { formatLabel, type PluralLabel } from '../../i18n/format-label';

/** Rating's own strings (§16.4): serialisable, English defaults. */
export interface RatingLabels {
  /**
   * The name without a count: `{value}` and `{max}`.
   * @default 'Rated {value} out of {max}'
   */
  label: string;
  /**
   * The name with a count: `{value}`, `{max}` and `{count}`; a `PluralLabel` picks by the count.
   * @default 'Rated {value} out of {max} from {count} reviews'
   */
  labelWithCount: string | PluralLabel;
  /**
   * The visible count; a `PluralLabel` picks by the count.
   * @default '({count} reviews)'
   */
  count: string | PluralLabel;
}

export interface RatingProps extends Omit<ComponentPropsWithRef<'span'>, 'children' | 'role'> {
  /** The score, from 0 to `max`. */
  value: number;
  /** @default 5 */
  max?: number;
  /** How many reviews it averages. */
  count?: number;
  /** BCP 47 tag for the numbers. @default 'en-US' */
  locale?: string;
  labels?: Partial<RatingLabels>;
  /** Must render a `<span>`. */
  render?: RenderProp<Record<string, never>>;
}

export function Rating({
  value,
  max = 5,
  count,
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: RatingProps): ReactElement {
  const score = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  const name =
    count === undefined
      ? formatLabel(labels?.label ?? 'Rated {value} out of {max}', { value: score, max }, locale)
      : formatLabel(
          labels?.labelWithCount ?? 'Rated {value} out of {max} from {count} reviews',
          { value: score, max, count },
          locale,
        );
  const filled = Math.floor(Math.min(Math.max(value, 0), max));
  const stars = Array.from({ length: max }, (_, index) => index < filled);
  return renderElement(
    'span',
    render,
    {},
    {
      role: 'img',
      'aria-label': name,
      'data-slot': 'rating',
      ...rest,
      className: cx('nz-rating', className),
      children: (
        <>
          <span className="nz-rating-stars" aria-hidden="true">
            {stars.map((on, index) => (
              <span
                // oxlint-disable-next-line react/no-array-index-key -- a fixed row of stars
                key={index}
                className="nz-rating-star"
                data-variant={on ? 'filled' : 'empty'}
              >
                <StarGlyph />
              </span>
            ))}
          </span>
          <span className="nz-rating-value" aria-hidden="true">
            {score}
          </span>
          {count !== undefined && (
            <span className="nz-rating-count" aria-hidden="true">
              {formatLabel(labels?.count ?? '({count} reviews)', { count }, locale)}
            </span>
          )}
        </>
      ),
    },
  );
}

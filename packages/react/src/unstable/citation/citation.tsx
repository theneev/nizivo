// NO directive: Citation is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's
// Citation 7410:151). A numbered mark after a claim in an AI answer, linking to its source (a
// SourceCard below the answer, or the page itself). Its accessible name says what it is, "Source 1:
// Moss & Kiln sales report", not just "1". Figma also shows the source in a Popover on hover and
// focus; that is not built yet (UNSTABLE: the AI kit is new and unreviewed).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { formatLabel } from '../../i18n/format-label';

/** Citation's own strings (§16.4): serialisable, English defaults. */
export interface CitationLabels {
  /**
   * The accessible name without a `title`: `{number}`.
   * @default 'Source {number}'
   */
  source: string;
  /**
   * The accessible name with a `title`: `{number}` and `{title}`.
   * @default 'Source {number}: {title}'
   */
  sourceTitled: string;
}

export interface CitationProps extends Omit<ComponentPropsWithRef<'a'>, 'children'> {
  /** The source's number, from 1, as the answer counts its sources. */
  number: number;
  /** Where the source is: `#source-1` for a SourceCard below the answer, or its URL. */
  href: string;
  /** The source's title, for the accessible name. */
  title?: string;
  /** BCP 47 tag for the number. @default 'en-US' */
  locale?: string;
  labels?: Partial<CitationLabels>;
  /** Must render an `<a>`, for example a router's link. */
  render?: RenderProp<Record<string, never>>;
}

export function Citation({
  number,
  href,
  title,
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: CitationProps): ReactElement {
  const name =
    title === undefined
      ? formatLabel(labels?.source ?? 'Source {number}', { number }, locale)
      : formatLabel(labels?.sourceTitled ?? 'Source {number}: {title}', { number, title }, locale);
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'citation',
      'aria-label': name,
      ...rest,
      href,
      className: cx('nz-citation', className),
      children: (
        <span className="nz-citation-number" data-slot="citation-number">
          {new Intl.NumberFormat(locale).format(number)}
        </span>
      ),
    },
  );
}

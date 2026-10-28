// NO directive: SourceCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's
// Source Card 7410:177). Where an AI answer came from, a web page or a file, under the answer or in
// a citation's popover. The whole card is one link. A web source opens in a new tab and says so to
// a screen reader; the number repeats the Citation that points here and is decorative.
// UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { FileTextGlyph, GlobeGlyph } from '../../_internal/glyphs';

/** SourceCard's own strings (§16.4): serialisable, English defaults. */
export interface SourceCardLabels {
  /**
   * Read after the title when the card opens in a new tab.
   * @default '(opens in a new tab)'
   */
  newTab: string;
}

export interface SourceCardProps extends Omit<ComponentPropsWithRef<'a'>, 'children' | 'title'> {
  href: string;
  /** The source's title, the card's main line. */
  title: string;
  /** Where it lives: a domain (`mossandkiln.com`) or a file's name or folder. */
  domain: string;
  /** The kind of source: a web page or a file. @default 'web' */
  type?: 'web' | 'file';
  /** The source's number, as the answer's Citations show it. */
  number?: number;
  /** Opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). @default type === 'web' */
  newTab?: boolean;
  /** BCP 47 tag for the number. @default 'en-US' */
  locale?: string;
  labels?: Partial<SourceCardLabels>;
  /** Must render an `<a>`, for example a router's link. */
  render?: RenderProp<Record<string, never>>;
}

export function SourceCard({
  href,
  title,
  domain,
  type = 'web',
  number,
  newTab = type === 'web',
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: SourceCardProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'source-card',
      'data-variant': type,
      ...(newTab && { target: '_blank', rel: 'noopener noreferrer' }),
      ...rest,
      href,
      className: cx('nz-source-card', className),
      children: (
        <>
          <span className="nz-source-card-header">
            <span className="nz-source-card-icon" aria-hidden="true">
              {type === 'file' ? <FileTextGlyph /> : <GlobeGlyph />}
            </span>
            <span className="nz-source-card-domain" data-slot="source-card-domain">
              {domain}
            </span>
            {number !== undefined && (
              <span className="nz-source-card-number" aria-hidden="true">
                {new Intl.NumberFormat(locale).format(number)}
              </span>
            )}
          </span>
          <span className="nz-source-card-title" data-slot="source-card-title">
            {title}
          </span>
          {newTab && (
            <span className="nz-visually-hidden"> {labels?.newTab ?? '(opens in a new tab)'}</span>
          )}
        </>
      ),
    },
  );
}

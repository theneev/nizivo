// NO directive: TestimonialCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp;
// Figma's Testimonial Card 7395:85). A real, attributed customer quote: a <figure> holding a
// <blockquote> and a <figcaption> with the person's name, job and avatar. The quote mark is
// decoration. Three in a row, or one large on its own. UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { QuoteGlyph } from '../../_internal/glyphs';

export interface TestimonialCardProps extends Omit<ComponentPropsWithRef<'figure'>, 'children'> {
  /** The quote, as said. */
  quote: ReactNode;
  /** Who said it. */
  name: ReactNode;
  /** Their job and company: "Founder, Moss & Kiln". */
  jobTitle?: ReactNode;
  /** An Avatar (lg); decorative, since the name is printed beside it. */
  avatar?: ReactNode;
  /** The quote's source, a URL, for `<blockquote cite>`. */
  cite?: string;
  /** Must render a `<figure>`. */
  render?: RenderProp<Record<string, never>>;
}

export function TestimonialCard({
  quote,
  name,
  jobTitle,
  avatar,
  cite,
  render,
  className,
  ...rest
}: TestimonialCardProps): ReactElement {
  return renderElement(
    'figure',
    render,
    {},
    {
      'data-slot': 'testimonial-card',
      ...rest,
      className: cx('nz-testimonial-card', className),
      children: (
        <>
          <span className="nz-testimonial-card-mark" aria-hidden="true">
            <QuoteGlyph />
          </span>
          <blockquote
            className="nz-testimonial-card-quote"
            data-slot="testimonial-card-quote"
            cite={cite}
          >
            {quote}
          </blockquote>
          <figcaption className="nz-testimonial-card-author" data-slot="testimonial-card-author">
            {avatar != null && (
              <span className="nz-testimonial-card-avatar" aria-hidden="true">
                {avatar}
              </span>
            )}
            <span className="nz-testimonial-card-name-block">
              <span className="nz-testimonial-card-name">{name}</span>
              {jobTitle != null && <span className="nz-testimonial-card-role">{jobTitle}</span>}
            </span>
          </figcaption>
        </>
      ),
    },
  );
}

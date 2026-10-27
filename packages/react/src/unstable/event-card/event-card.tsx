// NO directive: EventCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's
// Event Card 7397:145). A launch, a live session or a booking: a date block, the title, when and
// where, and who is going. The date block is presentational; the full date is a `<time datetime>`
// a screen reader reads with the title. Attendees go in `attendees`, best an AvatarGroup.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { ClockGlyph } from '../../_internal/glyphs';

/** EventCard's own strings (§16.4): serialisable, English defaults. */
export interface EventCardLabels {
  /** After the attendees. @default 'going' */
  going: string;
}

export interface EventCardProps extends Omit<ComponentPropsWithRef<'article'>, 'title'> {
  /** What it is: "Autumn collection live drop". */
  title: ReactNode;
  /** The title's level. @default 3 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** When it starts: a Date, or an ISO 8601 string. */
  date: Date | string;
  /** The time and place: "18:00 – 19:00 · Instagram Live". */
  when?: ReactNode;
  /** Who is going: an AvatarGroup. */
  attendees?: ReactNode;
  /** BCP 47 tag for the date. @default 'en-US' */
  locale?: string;
  /** The IANA time zone to show the date in. @default the runtime's */
  timeZone?: string;
  labels?: Partial<EventCardLabels>;
  /** Must render an `<article>`. */
  render?: RenderProp<Record<string, never>>;
}

export function EventCard({
  title,
  headingLevel = 3,
  date,
  when,
  attendees,
  locale = 'en-US',
  timeZone,
  labels,
  render,
  className,
  children,
  ...rest
}: EventCardProps): ReactElement {
  const at = typeof date === 'string' ? new Date(date) : date;
  const zone = timeZone === undefined ? {} : { timeZone };
  const part = (options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(locale, { ...options, ...zone }).format(at);
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'article',
    render,
    {},
    {
      'data-slot': 'event-card',
      ...rest,
      className: cx('nz-event-card', className),
      children: (
        <>
          <span className="nz-event-card-date" aria-hidden="true">
            <span className="nz-event-card-month">{part({ weekday: 'short' })}</span>
            <span className="nz-event-card-day">{part({ day: 'numeric' })}</span>
          </span>
          <div className="nz-event-card-details">
            <Heading className="nz-event-card-title" data-slot="event-card-title">
              {title}
            </Heading>
            <span className="nz-event-card-when">
              <span className="nz-event-card-icon" aria-hidden="true">
                <ClockGlyph />
              </span>
              <span>
                <time className="nz-visually-hidden" dateTime={at.toISOString()}>
                  {part({ dateStyle: 'full' })}
                </time>
                {when}
              </span>
            </span>
            {attendees != null && (
              <span className="nz-event-card-people">
                {attendees}
                <span className="nz-event-card-going">{labels?.going ?? 'going'}</span>
              </span>
            )}
            {children}
          </div>
        </>
      ),
    },
  );
}

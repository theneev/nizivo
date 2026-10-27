// NO directive: NotificationItem is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do;
// Figma's Notification Item 7396:102). One row of activity in a panel or an inbox: who, what and
// when, with an avatar. The whole row is one link. An unread row is tinted and carries a dot, and
// its name starts with "Unread", so the state is never the tint alone; `time` is best a `<time>`.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

/** NotificationItem's own strings (§16.4): serialisable, English defaults. */
export interface NotificationItemLabels {
  /** Read before an unread row's title. @default 'Unread' */
  unread: string;
}

export interface NotificationItemProps extends Omit<ComponentPropsWithRef<'a'>, 'title'> {
  /** What happened: "Jonah Okafor commented on Autumn launch". */
  title: ReactNode;
  /** A line under it: a quote, a detail. */
  detail?: ReactNode;
  /** When, after the detail: a `<time>` is best. */
  time?: ReactNode;
  /** An Avatar of who did it; decorative, since the title names them. */
  avatar?: ReactNode;
  /** @default false */
  unread?: boolean;
  labels?: Partial<NotificationItemLabels>;
  /** Must render an `<a>`, or a router link that renders one. */
  render?: RenderProp<Record<string, never>>;
}

export function NotificationItem({
  title,
  detail,
  time,
  avatar,
  unread = false,
  labels,
  render,
  className,
  ...rest
}: NotificationItemProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'notification-item',
      'data-variant': unread ? 'unread' : 'read',
      ...rest,
      className: cx('nz-notification-item', className),
      children: (
        <>
          {avatar != null && (
            <span className="nz-notification-item-avatar" aria-hidden="true">
              {avatar}
            </span>
          )}
          <span className="nz-notification-item-text">
            <span className="nz-notification-item-title" data-slot="notification-item-title">
              {unread && <span className="nz-visually-hidden">{labels?.unread ?? 'Unread'}: </span>}
              {title}
            </span>
            {(detail != null || time != null) && (
              <span className="nz-notification-item-detail" data-slot="notification-item-detail">
                {detail}
                {detail != null && time != null && ' · '}
                {time}
              </span>
            )}
          </span>
          {unread && <span className="nz-notification-item-dot" aria-hidden="true" />}
        </>
      ),
    },
  );
}

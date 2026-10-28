import type { JSX } from 'react';
import { Avatar } from '../../avatar/index';
import { NotificationItem } from './index';

/** Two rows in a panel: an unread comment and a read one. */
export function NotificationItemExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 4, maxInlineSize: 420 }}>
      <NotificationItem
        href="/posts/autumn-launch#comments"
        unread
        avatar={<Avatar name="Jonah Okafor" decorative />}
        title="Jonah Okafor commented on Autumn launch"
        detail="“Love the new cover photo — ship it.”"
        time={<time dateTime="2026-10-28T09:39">2 min ago</time>}
      />
      <NotificationItem
        href="/orders/1042"
        avatar={<Avatar name="Maya Rao" decorative />}
        title="Maya Rao placed order #1042"
        detail="2 items · $84.00"
        time={<time dateTime="2026-10-28T08:12">1 h ago</time>}
      />
    </div>
  );
}

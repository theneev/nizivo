import type { JSX } from 'react';
import { Avatar, AvatarGroup } from '../../avatar/index';
import { EventCard } from './index';

/**
 * Figma's live drop: the date block, the time and place, and who is going. `timeZone` keeps the
 * server's date and the browser's the same.
 */
export function EventCardExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 440 }}>
      <EventCard
        title="Autumn collection live drop"
        date="2026-11-16T18:00:00Z"
        timeZone="UTC"
        when="18:00 – 19:00 · Instagram Live"
        attendees={
          <AvatarGroup total={7} size="md">
            <Avatar name="Maya Rao" />
            <Avatar name="Jonah Okafor" />
            <Avatar name="Priya Raman" />
          </AvatarGroup>
        }
      />
    </div>
  );
}

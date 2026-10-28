import type { JSX } from 'react';
import { AnnouncementBar } from './index';

/** The bar: one message, a link and a close button. */
export function AnnouncementBarExample(): JSX.Element {
  return (
    <AnnouncementBar dismissible action={<a href="/changelog">Read the changelog →</a>}>
      Nizivo 0.5 is in review.
    </AnnouncementBar>
  );
}

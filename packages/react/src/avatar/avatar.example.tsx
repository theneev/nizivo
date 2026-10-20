import type { JSX } from 'react';
import { Avatar, AvatarGroup } from './index';

/** A stand-in portrait (an inline SVG), so the example needs no image file. */
const PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#c9b8a6"/>' +
      '<circle cx="32" cy="26" r="12" fill="#8a6f5a"/><rect x="12" y="42" width="40" height="30" rx="20" fill="#8a6f5a"/></svg>',
  );

/** A photo, the initials fallback at every size, and a decorative avatar next to a printed name. */
export function AvatarExample(): JSX.Element {
  return (
    <div>
      <Avatar name="Maya Rao" src={PHOTO} size="lg" />
      <Avatar name="Jonah Okafor" size="sm" />
      <Avatar name="Jonah Okafor" />
      <Avatar name="Jonah Okafor" size="lg" />
      <Avatar name="Jonah Okafor" size="xl" />
      <p>
        <Avatar name="Priya Shah" decorative /> Priya Shah
      </p>
    </div>
  );
}

/** Three faces and a count, read as one item: "Maya Rao, Jonah Okafor, Priya Shah, and 4 more". */
export function AvatarGroupExample(): JSX.Element {
  return (
    <AvatarGroup total={7}>
      <Avatar name="Maya Rao" src={PHOTO} />
      <Avatar name="Jonah Okafor" />
      <Avatar name="Priya Shah" src={PHOTO} />
    </AvatarGroup>
  );
}

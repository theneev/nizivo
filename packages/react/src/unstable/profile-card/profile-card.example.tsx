import type { JSX } from 'react';
import { Avatar } from '../../avatar/index';
import { Button } from '../../button/index';
import { ProfileCard } from './index';

/** Figma's card: who, what they do, three counts and Follow. */
export function ProfileCardExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 320 }}>
      <ProfileCard
        name="Alex Rivera"
        avatar={<Avatar name="Alex Rivera" size="xl" decorative />}
        description="Product designer · Lisbon"
        stats={[
          { label: 'Posts', value: '142' },
          { label: 'Followers', value: '8.2k' },
          { label: 'Following', value: '312' },
        ]}
        action={
          <Button variant="primary" aria-pressed={false} fullWidth>
            Follow
          </Button>
        }
      />
    </div>
  );
}

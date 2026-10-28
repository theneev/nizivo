// NO directive: ProfileCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's
// Profile Card 7397:114). A person at a glance: a cover, the avatar, the name as the card's
// heading, what they do, a few counts and one action. The counts are a description list, each read
// as "Posts, 142". Figma's cover is the Aurora shader: `cover={<ShaderSurface />}` draws it (M89);
// without it the cover is CSS gradients, and `cover` takes any picture in its place. The action is the app's (Figma's
// Follow is a Button with `aria-pressed` that becomes "Following"). UNSTABLE: v0.5 is unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

/** One count: "142 Posts". */
export interface ProfileStat {
  label: ReactNode;
  value: ReactNode;
}

export interface ProfileCardProps extends Omit<ComponentPropsWithRef<'article'>, 'children'> {
  /** The person's name: the card's heading. */
  name: ReactNode;
  /** The name's level. @default 3 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** An Avatar (xl); decorative, since the name is printed under it. */
  avatar?: ReactNode;
  /** What they do and where: "Product designer · Lisbon". */
  description?: ReactNode;
  /** Up to three counts. */
  stats?: readonly ProfileStat[];
  /** One action, full width: a Button. */
  action?: ReactNode;
  /** Replaces the CSS cover. Decorative: hidden from assistive technology. */
  cover?: ReactNode;
  /** Must render an `<article>`. */
  render?: RenderProp<Record<string, never>>;
}

export function ProfileCard({
  name,
  headingLevel = 3,
  avatar,
  description,
  stats,
  action,
  cover,
  render,
  className,
  ...rest
}: ProfileCardProps): ReactElement {
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'article',
    render,
    {},
    {
      'data-slot': 'profile-card',
      ...rest,
      className: cx('nz-profile-card', className),
      children: (
        <>
          <span className="nz-profile-card-cover" aria-hidden="true">
            {cover}
          </span>
          {avatar != null && (
            <span className="nz-profile-card-avatar" aria-hidden="true">
              {avatar}
            </span>
          )}
          <Heading className="nz-profile-card-name" data-slot="profile-card-name">
            {name}
          </Heading>
          {description != null && (
            <p className="nz-profile-card-description" data-slot="profile-card-description">
              {description}
            </p>
          )}
          {stats !== undefined && stats.length > 0 && (
            <dl className="nz-profile-card-stats" data-slot="profile-card-stats">
              {stats.map((stat, index) => (
                // oxlint-disable-next-line react/no-array-index-key -- the counts keep their order
                <div key={index} className="nz-profile-card-stat">
                  <dt className="nz-profile-card-stat-label">{stat.label}</dt>
                  <dd className="nz-profile-card-stat-value">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {action != null && <div className="nz-profile-card-action">{action}</div>}
        </>
      ),
    },
  );
}

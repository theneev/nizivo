// NO directive: Avatar and AvatarGroup are server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5;
// Figma Avatar 7370:21, Avatar Group 7370:26, page 11 Data Display).
//
// The fallback needs no script. The initials are always rendered, and the photo is an `alt=""` image
// laid over them; the person's name is the root's accessible name (`role="img"` + `aria-label`), not
// the image's. No `src` (or `image`): the initials show. A `src` that fails to load (measured in
// test/browser/avatar.spec.tsx, 2026-10-20): Firefox paints nothing, so the initials show; Chromium
// shows them with its 16 px broken-image mark in the box's top-left corner, mostly clipped by the
// circle; WebKit draws its "?" mark over the middle of them. No CSS can tell a broken image from a
// loaded one in WebKit, and the script-free alternatives fail too (an SVG <image> shows the mark in
// Chromium and WebKit; <object> is blocked by a strict CSP's object-src), so a URL that may be gone
// should not be passed as `src`. No `onError`, no hydration, the same server HTML either way.
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { formatLabel, type PluralLabel } from '../i18n/format-label';
import { cx } from '../_internal/cx';

/** `sm` 24, `md` 32, `lg` 40, `xl` 56 px. */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarState {
  size: AvatarSize;
  /** An image source or `image` element was given. */
  image: boolean;
  decorative: boolean;
}

export interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /**
   * The person's or store's name. It is the avatar's accessible name (unless `decorative`) and the
   * source of the initials.
   */
  name: string;
  /**
   * The photo. Without it (or `image`), the initials show. Pass it only when the image is known to
   * load: if it fails, Chromium and Firefox show the initials, but WebKit (Safari) draws its
   * broken-image mark over them, and no script-free markup avoids that. For a URL that may be gone,
   * check it on the server and leave `src` out (the initials render), or render the initials alone.
   */
  src?: string;
  /** Passed to the `<img>` with `src`. */
  srcSet?: string;
  sizes?: string;
  /**
   * A framework image element in place of `src`, for example `image={<NextImage src={photo} alt="" />}`.
   * It is cloned with the image slot's class and `alt=""`, and laid over the initials like `src`.
   */
  image?: ReactElement<{ className?: string | undefined }>;
  /**
   * Replaces the initials derived from `name` (the first letters of the first and last words).
   * At most two letters.
   */
  initials?: string;
  /** @default 'md' */
  size?: AvatarSize;
  /**
   * The name is printed next to the avatar, so the avatar is hidden from assistive technology,
   * as `alt=""` hides an image whose text is printed beside it. @default false
   */
  decorative?: boolean;
  /** Composition of the root `<span>`. */
  render?: RenderProp<AvatarState>;
}

/** A word's first character (a whole code point, so an astral letter is not split). */
const letter = (word: string): string => Array.from(word)[0] ?? '';

/** The first and last words' first letters, upper-cased; one word gives one letter. */
export function avatarInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/u)
    .filter((word) => word !== '');
  const first = words[0];
  if (first === undefined) return '';
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return (letter(first) + (last === undefined ? '' : letter(last))).toUpperCase();
}

/**
 * A person's or store's photo laid over their initials, with no script: the initials are always
 * rendered, so a missing photo needs no `onError`. Known limit: a `src` that fails to load shows
 * WebKit's (Safari's) broken-image mark over the initials, with no script-free fix; pass `src` only
 * when it is known to load, or leave it out and the initials show.
 */
export function Avatar({
  name,
  src,
  srcSet,
  sizes,
  image,
  initials,
  size = 'md',
  decorative = false,
  render,
  className,
  ...rest
}: AvatarProps): ReactElement {
  const hasImage = src !== undefined || image !== undefined;
  return renderElement(
    'span',
    render,
    { size, image: hasImage, decorative },
    {
      'data-slot': 'avatar',
      'data-size': size,
      ...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name }),
      ...rest,
      className: cx('nz-avatar', className),
      children: (
        <>
          <span className="nz-avatar-initials" data-slot="avatar-initials" aria-hidden="true">
            {initials ?? avatarInitials(name)}
          </span>
          {image !== undefined
            ? cloneElement(image, {
                'data-slot': 'avatar-image',
                alt: '',
                className: cx('nz-avatar-image', image.props.className),
              } as Record<string, unknown>)
            : src !== undefined && (
                <img
                  className="nz-avatar-image"
                  data-slot="avatar-image"
                  alt=""
                  src={src}
                  srcSet={srcSet}
                  sizes={sizes}
                  loading="lazy"
                  decoding="async"
                />
              )}
        </>
      ),
    },
  );
}

/**
 * AvatarGroup's own strings (§16.4): serialisable, English defaults. `{count}` is replaced by the
 * formatted count, and a `PluralLabel` (`{ one, few, many, other }`, the locale's CLDR categories)
 * picks its template by that count through `formatLabel`.
 */
export interface AvatarGroupLabels {
  /** The visible count after the shown avatars. @default '+{count}' */
  overflow: string | PluralLabel;
  /** The count's words in the group's accessible name ("Maya, Jonah, Priya and 4 more"). @default '{count} more' */
  more: string | PluralLabel;
}

export interface AvatarGroupState {
  size: AvatarSize;
  /** People not shown as an avatar. */
  hidden: number;
}

export interface AvatarGroupProps extends ComponentPropsWithRef<'span'> {
  /** How many avatars to show before the count; three at most reads best. @default 3 */
  max?: number;
  /**
   * Everyone in the group, when it is more than the avatars passed (the server sends three faces and
   * a count). @default the number of avatars
   */
  total?: number;
  /** Applied to every avatar and the count. @default 'md' */
  size?: AvatarSize;
  /** BCP 47 tag for the count and the list of names. @default 'en-US' */
  locale?: string;
  labels?: Partial<AvatarGroupLabels>;
  render?: RenderProp<AvatarGroupState>;
  /** `Avatar` elements. */
  children?: ReactNode;
}

/**
 * A stack of avatars and a count, announced as one item, such as "Maya, Jonah, Priya and 4 more":
 * the root is `role="img"` named by the list of names, and every avatar inside is decorative.
 */
export function AvatarGroup({
  max = 3,
  total,
  size = 'md',
  locale = 'en-US',
  labels,
  render,
  className,
  children,
  ...rest
}: AvatarGroupProps): ReactElement {
  const avatars = Children.toArray(children).filter((child): child is ReactElement<AvatarProps> =>
    isValidElement<AvatarProps>(child),
  );
  const shown = avatars.slice(0, Math.max(0, max));
  const hidden = Math.max(0, (total ?? avatars.length) - shown.length);
  const names = shown.map((avatar) => avatar.props.name);
  if (hidden > 0)
    names.push(formatLabel(labels?.more ?? '{count} more', { count: hidden }, locale));
  const label = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  return renderElement(
    'span',
    render,
    { size, hidden },
    {
      'data-slot': 'avatar-group',
      'data-size': size,
      role: 'img',
      'aria-label': label,
      ...rest,
      className: cx('nz-avatar-group', className),
      children: (
        <>
          {shown.map((avatar) => cloneElement(avatar, { size, decorative: true }))}
          {hidden > 0 && (
            <span className="nz-avatar-group-more" data-slot="avatar-group-more" aria-hidden="true">
              {formatLabel(labels?.overflow ?? '+{count}', { count: hidden }, locale)}
            </span>
          )}
        </>
      ),
    },
  );
}

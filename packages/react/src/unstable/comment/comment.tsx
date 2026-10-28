// NO directive: Comment is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's
// Comment 7397:64). One comment in a discussion on a post, a file or a design: who, when, what, then
// Like and Reply. Like is a toggle with its count in its name ("Like, 12"); `time` is best a
// `<time>` with the full date as its title. Replies indent under their parent, in `replies`.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { HeartGlyph, MessageCircleGlyph } from '../../_internal/glyphs';
import { formatLabel } from '../../i18n/format-label';

/** Comment's own strings (§16.4): serialisable, English defaults. */
export interface CommentLabels {
  /** The Like button's name: `{count}` is the likes. @default 'Like, {count}' */
  like: string;
  /** @default 'Reply' */
  reply: string;
}

export interface CommentProps extends Omit<ComponentPropsWithRef<'article'>, 'children'> {
  /** Who wrote it. */
  author: ReactNode;
  /** An Avatar of the author; decorative, since the name is printed beside it. */
  avatar?: ReactNode;
  /** When: a `<time>` with the full date as its title. */
  time?: ReactNode;
  /** The comment. */
  children: ReactNode;
  /** How many likes. Without it there is no Like button. */
  likes?: number;
  /** Whether the reader liked it (the toggle's `aria-pressed`). @default false */
  liked?: boolean;
  onLike?: () => void;
  /** Adds the Reply button. @default false */
  replyable?: boolean;
  onReply?: () => void;
  /** Replies, indented under this comment: more Comments. */
  replies?: ReactNode;
  /** BCP 47 tag for the count. @default 'en-US' */
  locale?: string;
  labels?: Partial<CommentLabels>;
  /** Must render an `<article>`. */
  render?: RenderProp<Record<string, never>>;
}

export function Comment({
  author,
  avatar,
  time,
  children,
  likes,
  liked = false,
  onLike,
  replyable = false,
  onReply,
  replies,
  locale = 'en-US',
  labels,
  render,
  className,
  ...rest
}: CommentProps): ReactElement {
  return renderElement(
    'article',
    render,
    {},
    {
      'data-slot': 'comment',
      ...rest,
      className: cx('nz-comment', className),
      children: (
        <>
          <div className="nz-comment-header">
            {avatar != null && (
              <span className="nz-comment-avatar" aria-hidden="true">
                {avatar}
              </span>
            )}
            <span className="nz-comment-author" data-slot="comment-author">
              {author}
            </span>
            {time != null && <span className="nz-comment-time">{time}</span>}
          </div>
          <div className="nz-comment-body" data-slot="comment-body">
            {children}
          </div>
          {(likes !== undefined || replyable) && (
            <div className="nz-comment-actions">
              {likes !== undefined && (
                <button
                  type="button"
                  className="nz-comment-action"
                  data-slot="comment-action"
                  aria-pressed={liked}
                  aria-label={formatLabel(
                    labels?.like ?? 'Like, {count}',
                    { count: likes },
                    locale,
                  )}
                  onClick={onLike}
                >
                  <span className="nz-comment-action-icon" aria-hidden="true">
                    <HeartGlyph />
                  </span>
                  <span
                    className="nz-comment-action-text"
                    data-slot="comment-action-text"
                    aria-hidden="true"
                  >
                    {new Intl.NumberFormat(locale).format(likes)}
                  </span>
                </button>
              )}
              {replyable && (
                <button
                  type="button"
                  className="nz-comment-action"
                  data-slot="comment-action"
                  onClick={onReply}
                >
                  <span className="nz-comment-action-icon" aria-hidden="true">
                    <MessageCircleGlyph />
                  </span>
                  <span className="nz-comment-action-text" data-slot="comment-action-text">
                    {labels?.reply ?? 'Reply'}
                  </span>
                </button>
              )}
            </div>
          )}
          {replies != null && (
            <div className="nz-comment-replies" data-slot="comment-replies">
              {replies}
            </div>
          )}
        </>
      ),
    },
  );
}

import type { JSX } from 'react';
import { Avatar } from '../../avatar/index';
import { Comment } from './index';

/** A comment with a reply under it. */
export function CommentExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 480 }}>
      <Comment
        author="Priya Raman"
        avatar={<Avatar name="Priya Raman" decorative />}
        time={
          <time dateTime="2026-10-28T07:41" title="28 October 2026, 07:41">
            2 h ago
          </time>
        }
        likes={12}
        replyable
        replies={
          <Comment
            author="Jonah Okafor"
            avatar={<Avatar name="Jonah Okafor" decorative />}
            time={
              <time dateTime="2026-10-28T08:05" title="28 October 2026, 08:05">
                1 h ago
              </time>
            }
            likes={3}
            liked
            replyable
          >
            Agreed — I’ll reshoot it this afternoon.
          </Comment>
        }
      >
        Could we try the sage glaze on the hero shot? It reads warmer next to the candles.
      </Comment>
    </div>
  );
}

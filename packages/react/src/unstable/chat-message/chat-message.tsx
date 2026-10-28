// NO directive: ChatMessage and ChatLog are server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a;
// D-dn; Figma's Chat Message 7396:26). One turn of a conversation, and the log that holds them.
// The person's turns are bg/brand bubbles at the end of the line, the assistant's bg/muted at the
// start with the sparkles mark. Each message names its sender in text ("You · 09:41"), never only by
// side or colour. ChatLog is `role="log"`, a polite live region: a new message is read when it is
// added. UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { SparklesGlyph } from '../../_internal/glyphs';

/** ChatMessage's own strings (§16.4): serialisable, English defaults. */
export interface ChatMessageLabels {
  /** The person's turns, unless `sender` is given. @default 'You' */
  user: string;
  /** The assistant's turns, unless `sender` is given. @default 'Assistant' */
  assistant: string;
}

export interface ChatMessageProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** Whose turn it is. */
  from: 'user' | 'assistant';
  /** Names the sender. Replaces `labels.user` or `labels.assistant`. */
  sender?: ReactNode;
  /** When it was sent, after the sender: a `<time>` is best. */
  time?: ReactNode;
  /** Replaces the assistant's sparkles mark, for example an Avatar. */
  avatar?: ReactNode;
  labels?: Partial<ChatMessageLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function ChatMessage({
  from,
  sender,
  time,
  avatar,
  labels,
  render,
  className,
  children,
  ...rest
}: ChatMessageProps): ReactElement {
  const name =
    sender ?? (from === 'user' ? (labels?.user ?? 'You') : (labels?.assistant ?? 'Assistant'));
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'chat-message',
      'data-variant': from,
      ...rest,
      className: cx('nz-chat-message', className),
      children: (
        <>
          {from === 'assistant' && (
            <span className="nz-chat-message-avatar" aria-hidden="true">
              {avatar ?? <SparklesGlyph />}
            </span>
          )}
          <div className="nz-chat-message-body">
            <div className="nz-chat-message-bubble" data-slot="chat-message-bubble">
              {children}
            </div>
            <div className="nz-chat-message-meta" data-slot="chat-message-meta">
              {name}
              {time != null && <> · {time}</>}
            </div>
          </div>
        </>
      ),
    },
  );
}

/** ChatLog's own strings (§16.4): serialisable, English defaults. */
export interface ChatLogLabels {
  /** The log's name, unless the consumer names it. @default 'Conversation' */
  label: string;
}

export interface ChatLogProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  labels?: Partial<ChatLogLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function ChatLog({ labels, render, className, ...rest }: ChatLogProps): ReactElement {
  const named = rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined;
  return renderElement(
    'div',
    render,
    {},
    {
      role: 'log',
      'aria-live': 'polite',
      'aria-label': named ? undefined : (labels?.label ?? 'Conversation'),
      'data-slot': 'chat-log',
      ...rest,
      className: cx('nz-chat-log', className),
    },
  );
}

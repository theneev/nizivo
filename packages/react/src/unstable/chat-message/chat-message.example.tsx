import type { JSX } from 'react';
import { ChatLog, ChatMessage } from './index';

/** A turn each way in a log: the person's request, then the assistant's answer. */
export function ChatMessageExample(): JSX.Element {
  return (
    <ChatLog style={{ maxInlineSize: 560 }}>
      <ChatMessage from="user" time={<time dateTime="09:41">09:41</time>}>
        Tag the mug and candle on yesterday’s posts, then publish.
      </ChatMessage>
      <ChatMessage from="assistant" sender="Nizivo AI" time={<time dateTime="09:41">09:41</time>}>
        Done — both products are tagged. The post is now shoppable at /mossandkiln.
      </ChatMessage>
    </ChatLog>
  );
}

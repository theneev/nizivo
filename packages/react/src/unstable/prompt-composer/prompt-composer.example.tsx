import type { JSX } from 'react';
import { IconButton } from '../../icon-button/index';
import { PromptComposer } from './index';

/** Stand-ins for `@nizivo/icons` glyphs (Lucide strokes). */
function Paperclip(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551" />
    </svg>
  );
}
function Mic(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19v3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <rect x="9" y="2" width="6" height="13" rx="3" />
    </svg>
  );
}

/** The composer: attach and dictate at the start, send at the end once there is text. */
export function PromptComposerExample(): JSX.Element {
  return (
    <PromptComposer
      style={{ maxInlineSize: 640 }}
      labels={{ placeholder: 'Ask Nizivo AI anything…' }}
      tools={
        <>
          <IconButton variant="secondary" size="sm" label="Attach file" icon={<Paperclip />} />
          <IconButton variant="secondary" size="sm" label="Dictate" icon={<Mic />} />
        </>
      }
    />
  );
}

/** With a draft: the send button is enabled. */
export function PromptComposerDraftExample(): JSX.Element {
  return (
    <PromptComposer
      style={{ maxInlineSize: 640 }}
      defaultValue="Which products sold out last week?"
    />
  );
}

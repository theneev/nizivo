import type { JSX } from 'react';
import { IconButton } from '../../icon-button/index';
import { ResponseBlock } from './index';

/** Stand-ins for `@nizivo/icons` glyphs (Lucide strokes). */
function Copy(): JSX.Element {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
function Refresh(): JSX.Element {
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

/**
 * Figma's four states of one answer: thinking, streaming with Stop, complete with actions, and an
 * error with Retry. Pass `onStop` and `onRetry` from the client component that streams the answer.
 */
export function ResponseBlockExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 24, maxInlineSize: 520 }}>
      <ResponseBlock status="thinking" thinking="Reading last week's orders…" />
      <ResponseBlock status="streaming">
        <p>Your three best sellers last week were the Moss mug, the Kiln</p>
      </ResponseBlock>
      <ResponseBlock
        status="complete"
        actions={
          <>
            <IconButton variant="tertiary" size="sm" label="Copy" icon={<Copy />} />
            <IconButton variant="tertiary" size="sm" label="Regenerate" icon={<Refresh />} />
          </>
        }
      >
        <p>
          Your three best sellers last week were the Moss mug, the Kiln bowl and the linen apron.
          The mug sold out on Thursday.
        </p>
      </ResponseBlock>
      <ResponseBlock
        status="error"
        error="The orders service did not answer. Nothing was changed."
      />
    </div>
  );
}

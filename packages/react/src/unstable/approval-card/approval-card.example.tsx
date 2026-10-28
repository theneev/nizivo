import type { JSX } from 'react';
import { ApprovalCard } from './index';

/**
 * The AI asks before sending emails it cannot unsend. `autoFocus={false}` here, since the card is
 * part of the page; in a conversation it appears in answer to the reader, and focus lands on Cancel.
 */
export function ApprovalCardExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 480 }}>
      <ApprovalCard
        title="Send 3 emails to customers?"
        confirmLabel="Send emails"
        autoFocus={false}
        summary={
          <>
            <span>To: 3 customers whose orders shipped late</span>
            <span>Subject: Your order is on its way</span>
          </>
        }
      >
        Each gets a short apology and a 10 % code. Sent emails cannot be unsent.
      </ApprovalCard>
    </div>
  );
}

/** The card: `onEdit` adds "Edit first", which opens the draft before anything is sent. */
export function ApprovalCardEditFirstExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 480 }}>
      <ApprovalCard
        title="Send 3 emails to customers?"
        confirmLabel="Send emails"
        autoFocus={false}
        onEdit={() => {}}
        summary={
          <>
            <span>To: 3 customers whose orders shipped late</span>
            <span>Subject: Your order is on its way</span>
          </>
        }
      >
        Each gets a short apology and a 10 % code. Sent emails cannot be unsent.
      </ApprovalCard>
    </div>
  );
}

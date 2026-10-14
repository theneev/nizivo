import type { JSX } from 'react';
import { Button } from '../button/index';
import { Alert, AlertDismiss } from './index';

/** Stand-ins for `@nizivo/icons` glyphs. */
function Mark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function Cross(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

/** Server-rendered and static: no live role, no dismiss, no client JS. */
export function AlertExample(): JSX.Element {
  return (
    <Alert icon={<Mark />} title="Payouts move to daily on Nov 1">
      No action needed.
    </Alert>
  );
}

/**
 * Injected after a payment attempt, so it is announced. Dismissal is the caller's state: pass
 * `onDismiss` from a client component, or a Server Action from a Server Component.
 */
export function AlertDismissibleExample({ onDismiss }: { onDismiss?: () => void }): JSX.Element {
  return (
    <Alert
      tone="critical"
      role="alert"
      icon={<Mark />}
      title="Payment failed for order #1040"
      action={<Button size="sm">Retry payment</Button>}
      dismiss={
        <AlertDismiss {...(onDismiss && { onDismiss })}>
          <Cross />
        </AlertDismiss>
      }
    >
      Card was declined.
    </Alert>
  );
}

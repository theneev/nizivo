// A dismissible Alert as one island: Alert's server shell cannot wrap a client leaf across the
// .astro boundary, so the whole Alert is the island and only its dismiss leaf is a client module.
import { Alert, AlertDismiss } from '@nizivo/react/alert';

function Cross() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

export function DismissibleAlert() {
  return (
    <Alert
      tone="critical"
      role="alert"
      title="Payment failed for order #1040"
      dismiss={
        <AlertDismiss>
          <Cross />
        </AlertDismiss>
      }
    >
      Card was declined.
    </Alert>
  );
}

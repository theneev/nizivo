// A dismissible Alert: the dismiss button is the one client leaf (alert-dismiss.client).
import { Alert, AlertDismiss } from '@nizivo/react/alert';
import { Heading } from '@nizivo/react/heading';

function Cross() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

export default function Page() {
  return (
    <main>
      <Heading level={1}>A dismissible Alert</Heading>
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
    </main>
  );
}

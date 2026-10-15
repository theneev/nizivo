// Button through the root barrel, rendered on the server with no client directive.
import { Button } from '@nizivo/react';

export function Buttons() {
  return (
    <p>
      <Button variant="primary">Save</Button> <Button>Cancel</Button>{' '}
      <Button variant="tertiary">Help</Button>
    </p>
  );
}

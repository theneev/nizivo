// Button through the root barrel: no client module may ship, and the page's chunk must match the
// subpath page's (the barrel is tree-shaken).
import { Button } from '@nizivo/react';

export default function Page() {
  return (
    <main>
      <h1>Button from the barrel</h1>
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
      <Button variant="tertiary">Help</Button>
    </main>
  );
}

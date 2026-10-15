// Button through its subpath, the import the docs teach first.
import { Button } from '@nizivo/react/button';

export default function Page() {
  return (
    <main>
      <h1>Button from its subpath</h1>
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
      <Button variant="tertiary">Help</Button>
    </main>
  );
}

// (a) Server-only page: Button through its own subpath.
import { Button } from '@nizivo/react/button';

export default function Page() {
  return (
    <main>
      <h1>Server-only (subpath)</h1>
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
    </main>
  );
}

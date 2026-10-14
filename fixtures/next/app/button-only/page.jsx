// (a) Server-only page: Button through the root barrel. It must load no @nizivo client module.
import { Button } from '@nizivo/react';

export default function Page() {
  return (
    <main>
      <h1>Server-only (barrel)</h1>
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
    </main>
  );
}

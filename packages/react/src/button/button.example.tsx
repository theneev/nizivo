import type { ComponentPropsWithRef, JSX } from 'react';
import { Button } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

export function ButtonExample(): JSX.Element {
  return (
    <div>
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
      <Button variant="accent">Upgrade</Button>
      <Button variant="critical">Remove</Button>
      <Button size="lg">Continue</Button>
      <Button variant="critical" size="sm" disabled>
        Delete
      </Button>
      <Button variant="tertiary" pending>
        Publishing
      </Button>
      <Button render={<Link href="/orders" />} fullWidth>
        Orders
      </Button>
    </div>
  );
}

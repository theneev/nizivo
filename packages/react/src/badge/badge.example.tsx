import type { ComponentPropsWithRef, JSX } from 'react';
import { Badge } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

export function BadgeExample(): JSX.Element {
  return (
    <div>
      <Badge tone="success">Paid</Badge>
      <Badge tone="warning">Pending</Badge>
      <Badge tone="critical">Refunded</Badge>
      <Badge tone="info">Partially fulfilled</Badge>
      <Badge>Draft</Badge>
      <Badge tone="brand" dot={false}>
        New
      </Badge>
      <Badge render={<Link href="/orders?status=paid" />} tone="success">
        Paid
      </Badge>
    </div>
  );
}

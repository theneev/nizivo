import type { JSX } from 'react';
import { Link } from './index';

/** Figma's links: one in the app, and one that opens another site in a new tab. */
export function LinkExample(): JSX.Element {
  return (
    <p style={{ display: 'flex', gap: 24, margin: 0 }}>
      <Link href="/orders">View all orders</Link>
      <Link href="https://example.com/help" external>
        Help centre
      </Link>
    </p>
  );
}

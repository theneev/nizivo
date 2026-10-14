import type { JSX } from 'react';
import { Button } from '../button/index';
import { EmptyState } from './index';

/** Stands in for the Figma render (a box illustration); renders are not shipped. */
function BoxRender(): JSX.Element {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
      <rect x="30" y="40" width="80" height="70" rx="8" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

/** Figma Context=Orders and Context=Search are content, not props. */
export function EmptyStateExample(): JSX.Element {
  return (
    <div>
      <EmptyState
        title="No orders yet"
        media={<BoxRender />}
        actions={<Button variant="primary">Share your store</Button>}
      />
      <EmptyState
        level={3}
        title="Nothing matches “stoneware”"
        actions={<Button>Clear search</Button>}
      />
    </div>
  );
}

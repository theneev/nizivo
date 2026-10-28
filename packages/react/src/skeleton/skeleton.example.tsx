import type { JSX } from 'react';
import { Skeleton } from './index';

/** Lines: the region being loaded is busy and says so; the blocks are hidden. */
export function SkeletonExample(): JSX.Element {
  return (
    <div aria-busy="true">
      <span className="nz-visually-hidden">Loading orders</span>
      <Skeleton />
      <Skeleton className="orders-skeleton-short" />
      <Skeleton className="orders-skeleton-shorter" />
    </div>
  );
}

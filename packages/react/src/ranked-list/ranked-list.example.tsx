import type { ComponentPropsWithRef, JSX } from 'react';
import { RankedList } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

const CHANNELS = [
  ['Online store', 64120],
  ['Instagram Shop', 21804],
  ['Wholesale', 18240],
  ['Pop-up market', 9312],
  ['Marketplace', 6050],
] as const;

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

/** "Top channels": five rows, bars relative to the leader, "View all" as a real link. */
export function RankedListExample(): JSX.Element {
  return (
    <RankedList.Root
      title="Top channels"
      action={<RankedList.Action render={<Link href="/channels" />}>View all</RankedList.Action>}
      format={USD}
    >
      {CHANNELS.map(([label, value]) => (
        <RankedList.Item key={label} label={label} value={value} />
      ))}
    </RankedList.Root>
  );
}

/**
 * The Suspense fallback is the same list with `status="loading"`: it reserves five rows, so the box
 * does not move when the data streams in (§16.5). Empty and error keep the same box.
 */
export function RankedListStatesExample(): JSX.Element {
  return (
    <div>
      <RankedList.Root title="Top channels" status="loading" />
      <RankedList.Root title="Top cities" status="empty" />
      <RankedList.Root title="Top products" status="error" />
    </div>
  );
}

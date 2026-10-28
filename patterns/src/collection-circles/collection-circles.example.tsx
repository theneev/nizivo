import type { JSX } from 'react';
import { Text } from '@nizivo/react/text';

interface Collection {
  id: string;
  label: string;
  href: string;
  /** The shopper has opened it since its last new pick. */
  seen: boolean;
}

const COLLECTIONS: Collection[] = [
  { id: 'mornings', label: 'Slow mornings', href: '/collections/slow-mornings', seen: false },
  { id: 'table', label: 'Set the table', href: '/collections/set-the-table', seen: false },
  {
    id: 'kiln',
    label: 'Fresh from the kiln',
    href: '/collections/fresh-from-the-kiln',
    seen: true,
  },
  { id: 'gifts', label: 'Small gifts', href: '/collections/small-gifts', seen: true },
  { id: 'seconds', label: 'Seconds', href: '/collections/seconds', seen: true },
  { id: 'linen', label: 'Linen', href: '/collections/linen', seen: true },
  { id: 'candles', label: 'Candles', href: '/collections/candles', seen: true },
];

/**
 * Collection Circles in a rail: one link per collection, its cover in a
 * ring and its name under it. A new collection has a thick brand ring and a bold name, and its link
 * says ", new picks" to screen readers; a seen one has a thin grey ring. The list scrolls sideways
 * when it outgrows its container, and each link is a Tab stop, so the keyboard reaches every
 * circle. A server composition: it ships no JavaScript. The cover stands in for the collection's
 * `Image`.
 */
export function CollectionCirclesExample(): JSX.Element {
  return (
    <ul className="nzp-collection-circles" aria-label="Collections">
      {COLLECTIONS.map((collection) => (
        <li key={collection.id}>
          <a
            className={
              collection.seen
                ? 'nzp-collection-circles-link nzp-collection-circles-seen'
                : 'nzp-collection-circles-link'
            }
            href={collection.href}
          >
            <span className="nzp-collection-circles-ring" aria-hidden="true">
              <span className="nzp-collection-circles-cover" />
            </span>
            <Text
              render={<span />}
              className="nzp-collection-circles-label"
              variant={collection.seen ? 'label-m' : 'label-m-strong'}
              tone={collection.seen ? 'secondary' : 'primary'}
            >
              {collection.label}
            </Text>
            {!collection.seen && <span className="nz-visually-hidden">, new picks</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

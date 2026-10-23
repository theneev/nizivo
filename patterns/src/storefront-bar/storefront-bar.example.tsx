import type { ComponentPropsWithRef, JSX } from 'react';
import { Avatar } from '@nizivo/react/avatar';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { IconButton } from '@nizivo/react/icon-button';
import { NumberValue } from '@nizivo/react/number-value';
import { Text } from '@nizivo/react/text';
import { ShoppingBag } from '@nizivo/icons';
import { Instagram } from '@nizivo/icons/brands/instagram';

/** Stands in for the app's router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

interface Store {
  name: string;
  /** The store's Instagram profile; the glyph only ever links there. */
  instagramUrl: string;
  followers: number;
  /** Items in the shopper's bag. */
  bagCount: number;
}

const STORE: Store = {
  name: 'Moss & Kiln',
  instagramUrl: 'https://www.instagram.com/',
  followers: 12_480,
  bagCount: 2,
};

/** "Bag, 2 items": the bag's name says the count, which the badge only shows. */
function bagLabel(count: number): string {
  if (count === 0) return 'Bag, empty';
  return `Bag, ${count} ${count === 1 ? 'item' : 'items'}`;
}

/**
 * Figma 10's Storefront Bar (`7275:19889`): the top of a store, with its Avatar, its name beside the
 * Instagram glyph (a link to the store's Instagram profile, the glyph's only allowed use), the
 * follower count in compact notation, a Follow Button and the bag. The bag is an IconButton whose
 * name carries the count ("Bag, 2 items"); the count badge on it is decoration. The IconButton
 * carries its Tooltip, a client component. When the bar is too narrow for one row, the actions wrap
 * under the store's name; a long name is cut with an ellipsis.
 */
export function StorefrontBarExample(): JSX.Element {
  return (
    <header className="nzp-storefront-bar">
      <div className="nzp-storefront-bar-identity">
        <Avatar name={STORE.name} decorative />
        <div className="nzp-storefront-bar-text">
          <span className="nzp-storefront-bar-title">
            <Text render={<span />} variant="label-l" className="nzp-storefront-bar-name">
              {STORE.name}
            </Text>
            <a
              className="nzp-storefront-bar-instagram"
              href={STORE.instagramUrl}
              aria-label={`${STORE.name} on Instagram`}
            >
              <Instagram size={16} />
            </a>
          </span>
          <Text render={<span />} tone="secondary" className="nzp-storefront-bar-followers">
            <NumberValue
              value={STORE.followers}
              format={{ notation: 'compact', maximumFractionDigits: 1 }}
            />{' '}
            followers
          </Text>
        </div>
      </div>
      <div className="nzp-storefront-bar-actions">
        <Button variant="primary">Follow</Button>
        <span className="nzp-storefront-bar-bag">
          <IconButton
            label={bagLabel(STORE.bagCount)}
            icon={<ShoppingBag />}
            render={<Link href="/bag" />}
          />
          {STORE.bagCount > 0 && (
            <Badge className="nzp-storefront-bar-count" tone="brand" dot={false} aria-hidden="true">
              {STORE.bagCount > 99 ? '99+' : STORE.bagCount}
            </Badge>
          )}
        </span>
      </div>
    </header>
  );
}

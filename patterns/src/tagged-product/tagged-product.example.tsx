import type { ComponentPropsWithRef, JSX } from 'react';
import { IconButton } from '@nizivo/react/icon-button';
import { NumberValue } from '@nizivo/react/number-value';
import { Text } from '@nizivo/react/text';
import { Check, Plus } from '@nizivo/icons';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

/** Stands in for the app's router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

interface TaggedProduct {
  id: string;
  name: string;
  variant: string;
  price: number;
  href: string;
  /** Already in the shopper's bag. */
  inBag: boolean;
}

const PRODUCTS: TaggedProduct[] = [
  {
    id: 'mug',
    name: 'Moss mug',
    variant: 'Moss · 350 ml',
    price: 28,
    href: '/products/moss-mug',
    inBag: true,
  },
  {
    id: 'vase',
    name: 'Ash bud vase',
    variant: 'Ash · 14 cm',
    price: 34,
    href: '/products/ash-bud-vase',
    inBag: false,
  },
];

/**
 * Figma 10's Tagged Product (`7275:19862`): the products in a post, listed under its photo. Each row
 * has a thumbnail, the name as a link to the product, the variant and the price, and an add-to-bag
 * IconButton named for its product ("Add Moss mug to bag"). It is a toggle: a product already in the
 * bag shows a check, the button is pressed, and the row says "In your bag" in words. The IconButton
 * carries its Tooltip, a client component. The thumbnail stands in for the product's `Image`.
 */
export function TaggedProductExample(): JSX.Element {
  return (
    <ul className="nzp-tagged-product" aria-label="In this post">
      {PRODUCTS.map((product) => (
        <li key={product.id} className="nzp-tagged-product-row">
          <span className="nzp-tagged-product-thumb" aria-hidden="true" />
          <span className="nzp-tagged-product-info">
            <Text
              render={<Link href={product.href} />}
              className="nzp-tagged-product-name"
              variant="label-m-strong"
            >
              {product.name}
            </Text>
            <Text render={<span />} tone="secondary">
              {product.inBag ? `${product.variant} · In your bag` : product.variant}
            </Text>
            <Text render={<span />} variant="numeric-m">
              <NumberValue value={product.price} format={USD} />
            </Text>
          </span>
          <IconButton
            label={`Add ${product.name} to bag`}
            icon={product.inBag ? <Check /> : <Plus />}
            variant={product.inBag ? 'primary' : 'secondary'}
            pressed={product.inBag}
          />
        </li>
      ))}
    </ul>
  );
}

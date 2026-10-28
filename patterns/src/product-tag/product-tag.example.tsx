import type { ComponentPropsWithRef, JSX } from 'react';
import { Button } from '@nizivo/react/button';
import { NumberValue } from '@nizivo/react/number-value';
import { Popover } from '@nizivo/react/popover';
import { Text } from '@nizivo/react/text';
import { ArrowRight, Tag } from '@nizivo/icons';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

/** Stands in for the app's router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

interface ProductTag {
  id: string;
  name: string;
  price: number;
  href: string;
  /** Where the product sits on the photo, 0 to 1 from the start edge and from the top. */
  x: number;
  y: number;
}

/** Sorted by y, then x, so the Tab order follows the reading order of the photo. */
const TAGS: ProductTag[] = [
  { id: 'vase', name: 'Ash bud vase', price: 34, href: '/products/ash-bud-vase', x: 0.68, y: 0.3 },
  { id: 'mug', name: 'Moss mug', price: 28, href: '/products/moss-mug', x: 0.32, y: 0.58 },
];

/** One hotspot: a named button on the photo that opens the product's name, price and link. */
function Hotspot({ tag }: { tag: ProductTag }): JSX.Element {
  return (
    <div
      className="nzp-product-tag-spot"
      style={{ insetInlineStart: `${tag.x * 100}%`, insetBlockStart: `${tag.y * 100}%` }}
    >
      <Popover.Root>
        <Popover.Trigger className="nzp-product-tag-dot" aria-label={`Product: ${tag.name}`}>
          <span className="nzp-product-tag-mark" />
        </Popover.Trigger>
        <Popover.Popup side="end" className="nzp-product-tag-popup">
          <Popover.Title level={3}>{tag.name}</Popover.Title>
          <Popover.Description>
            <Text render={<span />} variant="numeric-m" tone="primary">
              <NumberValue value={tag.price} format={USD} />
            </Text>
          </Popover.Description>
          <Button
            size="sm"
            variant="primary"
            trailingIcon={<ArrowRight />}
            render={<Link href={tag.href} />}
          >
            View product
          </Button>
        </Popover.Popup>
      </Popover.Root>
    </div>
  );
}

/**
 * Product Tags on a post's photo: each dot is a button named for its
 * product ("Product: Moss mug") that opens a Popover with the name, the price and a link to the
 * product. Escape or a press outside closes it, and focus returns to the dot. The dots sit at
 * fractions of the photo's size, so they stay on their products at any width. The Popover is a
 * client component; the photo stays server-rendered. The media block stands in for the post's
 * `Image`.
 */
export function ProductTagExample(): JSX.Element {
  return (
    <figure className="nzp-product-tag" aria-label="Products tagged in this photo">
      <span className="nzp-product-tag-media" aria-hidden="true" />
      {TAGS.map((tag) => (
        <Hotspot key={tag.id} tag={tag} />
      ))}
      <figcaption className="nzp-product-tag-hint">
        <Tag size={16} />
        Tap a dot to shop
      </figcaption>
    </figure>
  );
}

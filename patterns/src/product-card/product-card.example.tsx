import type { JSX } from 'react';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Card } from '@nizivo/react/card';
import { NumberValue } from '@nizivo/react/number-value';
import { Text } from '@nizivo/react/text';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

/** Publication and inventory are separate facts; the card's one badge is derived from both. */
type Status = 'active' | 'draft' | 'low' | 'sold-out';

/** Each status's words and tone. The words carry the meaning; the tone only repeats it. */
const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
  low: { label: 'Low stock', tone: 'warning' },
  'sold-out': { label: 'Sold out', tone: 'critical' },
};

interface Product {
  id: string;
  title: string;
  status: Status;
  stock: number;
  price: number;
  /** The price before a sale, when the product is on sale. */
  compareAt?: number;
}

const PRODUCTS: Product[] = [
  { id: 'stoneware-mug', title: 'Stoneware mug', status: 'active', stock: 124, price: 28 },
  {
    id: 'linen-apron',
    title: 'Linen apron',
    status: 'active',
    stock: 40,
    price: 32,
    compareAt: 42,
  },
  { id: 'night-serum', title: 'Night serum', status: 'low', stock: 4, price: 52 },
  { id: 'fig-candle', title: 'Fig and cedar candle', status: 'draft', stock: 36, price: 34 },
  { id: 'market-tote', title: 'Market tote', status: 'sold-out', stock: 0, price: 46 },
];

/** The price, and on a sale the struck-through original, each named in words for screen readers. */
function Price({
  price,
  compareAt,
}: {
  price: number;
  compareAt?: number | undefined;
}): JSX.Element {
  if (compareAt === undefined) {
    return (
      <Text render={<span />} variant="numeric-m">
        <NumberValue value={price} format={USD} />
      </Text>
    );
  }
  return (
    <span className="nzp-product-card-price">
      <Text render={<span />} variant="numeric-m" tone="critical">
        <span className="nz-visually-hidden">Sale price </span>
        <NumberValue value={price} format={USD} />
      </Text>
      <Text render={<s />} variant="numeric-m" tone="secondary">
        <span className="nz-visually-hidden">Regular price </span>
        <NumberValue value={compareAt} format={USD} />
      </Text>
    </span>
  );
}

/** The inventory line: a count in words, coloured only when it needs attention. */
function Stock({ product }: { product: Product }): JSX.Element {
  if (product.status === 'draft') {
    return <Text tone="secondary">Not published</Text>;
  }
  if (product.stock === 0) {
    return <Text tone="critical">Out of stock</Text>;
  }
  return (
    <Text tone={product.status === 'low' ? 'warning' : 'secondary'}>
      <NumberValue value={product.stock} /> in stock
    </Text>
  );
}

/** One catalogue tile: the whole card is the link to the product, through its title. */
function ProductCard({ product }: { product: Product }): JSX.Element {
  const status = STATUS[product.status];
  return (
    <Card.Root className="nzp-product-card" padding="sm" render={<article />}>
      <div className="nzp-product-card-media">
        <span className="nzp-product-card-image" aria-hidden="true" />
        <Badge className="nzp-product-card-badge" tone={status.tone}>
          {status.label}
        </Badge>
      </div>
      <div className="nzp-product-card-body">
        <div className="nzp-product-card-row">
          <Card.Title className="nzp-product-card-title">
            <a className="nzp-product-card-link" href={`#${product.id}`}>
              {product.title}
            </a>
          </Card.Title>
          <Price price={product.price} compareAt={product.compareAt} />
        </div>
        <Stock product={product} />
      </div>
    </Card.Root>
  );
}

/**
 * Product Cards as a catalogue grid. Each card is an `<article>` whose
 * title is its one link: the link's box is stretched over the card, so the whole card is the hit
 * area but the card is a single Tab stop with a short name. A server composition: it ships no
 * JavaScript. The grey block stands in for the product's `Image`.
 */
export function ProductCardExample(): JSX.Element {
  return (
    <ul className="nzp-product-card-grid" aria-label="Products">
      {PRODUCTS.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

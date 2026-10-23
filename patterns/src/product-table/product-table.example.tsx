import type { JSX } from 'react';
import { Ellipsis } from '@nizivo/icons';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { IconButton } from '@nizivo/react/icon-button';
import { Menu } from '@nizivo/react/menu';
import { NumberValue } from '@nizivo/react/number-value';
import { Table } from '@nizivo/react/table';
import { TableSelectAll, TableSelection, TableSelectRow } from '@nizivo/react/table-selection';
import { Text } from '@nizivo/react/text';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

/** Publication and inventory are separate facts; the row's one badge is derived from both. */
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
  sku: string;
  status: Status;
  stock: number;
  price: number;
}

const PRODUCTS: Product[] = [
  {
    id: 'mug-014',
    title: 'Stoneware mug',
    sku: 'FRN-MUG-014',
    status: 'active',
    stock: 124,
    price: 28,
  },
  {
    id: 'candle-002',
    title: 'Fig and cedar candle',
    sku: 'FRN-CND-002',
    status: 'draft',
    stock: 36,
    price: 34,
  },
  {
    id: 'throw-101',
    title: 'Wool throw',
    sku: 'FRN-TXT-101',
    status: 'active',
    stock: 18,
    price: 189,
  },
  { id: 'serum-207', title: 'Night serum', sku: 'FRN-SKN-207', status: 'low', stock: 4, price: 52 },
  {
    id: 'tote-031',
    title: 'Market tote',
    sku: 'FRN-BAG-031',
    status: 'sold-out',
    stock: 0,
    price: 46,
  },
];

/** The inventory cell: a count in words, coloured only when it needs attention. */
function Inventory({ product }: { product: Product }): JSX.Element {
  const tone = product.status === 'low' ? 'warning' : 'secondary';
  return product.stock === 0 ? (
    <Text render={<span />} tone="critical">
      Out of stock
    </Text>
  ) : (
    <Text render={<span />} tone={tone}>
      <NumberValue value={product.stock} /> in stock
    </Text>
  );
}

/**
 * Figma 05's Product Row (`7275:14040`) as a bulk-editable catalogue table. Each row's checkbox is a
 * native input of the form above the table, so "Archive selected" submits the checked ids before any
 * JavaScript runs; `TableSelection` adds the select-all box, Shift-click ranges and Escape. Each row's
 * "…" opens a Menu named for that product. The thumbnail stands in for the product's `Image`.
 */
export function ProductTableExample(): JSX.Element {
  return (
    <TableSelection className="nzp-product-table">
      <form id="product-table-bulk" action="#" className="nzp-product-table-actions">
        <Button type="submit" size="sm" name="action" value="archive">
          Archive selected
        </Button>
        <Button type="submit" size="sm" name="action" value="publish">
          Publish selected
        </Button>
      </form>
      <Table.Container label="Products">
        <Table.Root>
          <Table.Caption visuallyHidden>Products</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head>
                <TableSelectAll labels={{ selectAll: 'Select all products' }} />
              </Table.Head>
              <Table.Head>Product</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Inventory</Table.Head>
              <Table.Head numeric>Price</Table.Head>
              <Table.Head className="nzp-product-table-actions-head">
                <span className="nz-visually-hidden">Actions</span>
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {PRODUCTS.map((product) => (
              <Table.Row key={product.id}>
                <Table.Cell>
                  <TableSelectRow
                    value={product.id}
                    form="product-table-bulk"
                    aria-label={`Select ${product.title}`}
                    defaultChecked={product.id === 'throw-101'}
                  />
                </Table.Cell>
                <Table.Head scope="row">
                  <span className="nzp-product-table-product">
                    <span className="nzp-product-table-thumb" aria-hidden="true" />
                    <span className="nzp-product-table-name">
                      <Text render={<span />} variant="label-m-strong">
                        {product.title}
                      </Text>
                      <Text render={<span />} variant="mono-m" tone="tertiary">
                        {product.sku}
                      </Text>
                    </span>
                  </span>
                </Table.Head>
                <Table.Cell>
                  <Badge tone={STATUS[product.status].tone}>{STATUS[product.status].label}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Inventory product={product} />
                </Table.Cell>
                <Table.Cell numeric>
                  <NumberValue value={product.price} format={USD} />
                </Table.Cell>
                <Table.Cell>
                  <Menu.Root>
                    <Menu.Trigger
                      render={
                        <IconButton
                          label={`Actions for ${product.title}`}
                          icon={<Ellipsis />}
                          variant="tertiary"
                          size="sm"
                        />
                      }
                    />
                    <Menu.Popup align="end">
                      <Menu.Item href={`#edit-${product.id}`}>Edit product</Menu.Item>
                      <Menu.Item>Duplicate</Menu.Item>
                      <Menu.Separator />
                      <Menu.Item tone="critical">Archive</Menu.Item>
                    </Menu.Popup>
                  </Menu.Root>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.Container>
    </TableSelection>
  );
}

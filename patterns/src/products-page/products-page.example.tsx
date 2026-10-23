import type { JSX } from 'react';
import { Plus, SlidersHorizontal, Upload } from '@nizivo/icons';
import { Badge, type BadgeTone } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { NumberValue } from '@nizivo/react/number-value';
import { PageHeader } from '@nizivo/react/page-header';
import { Pagination } from '@nizivo/react/pagination';
import { SearchField } from '@nizivo/react/search-field';
import { Select } from '@nizivo/react/select';
import { TabNav } from '@nizivo/react/tab-nav';
import { Table } from '@nizivo/react/table';
import { TableSelectAll, TableSelection, TableSelectRow } from '@nizivo/react/table-selection';
import { Text, type TextTone } from '@nizivo/react/text';

/** Prices in the store's currency: Intl formats them, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

type Status = 'active' | 'draft' | 'archived';

interface Product {
  id: string;
  name: string;
  sku: string;
  status: Status;
  stock: number;
  price: number;
}

const PRODUCTS: Product[] = [
  { id: 'mug-014', name: 'Stoneware mug', sku: 'MUG-014', status: 'active', stock: 124, price: 28 },
  { id: 'apron-002', name: 'Linen apron', sku: 'APR-002', status: 'active', stock: 8, price: 42 },
  { id: 'coaster-007', name: 'Coaster set', sku: 'CST-007', status: 'active', stock: 0, price: 18 },
  { id: 'bowl-021', name: 'Speckled bowl', sku: 'BWL-021', status: 'active', stock: 36, price: 24 },
  { id: 'vase-003', name: 'Bud vase', sku: 'VAS-003', status: 'draft', stock: 15, price: 32 },
  { id: 'plate-011', name: 'Side plate', sku: 'PLT-011', status: 'active', stock: 64, price: 14.5 },
  { id: 'towel-005', name: 'Tea towel', sku: 'TWL-005', status: 'archived', stock: 0, price: 12 },
  { id: 'jug-002', name: 'Pouring jug', sku: 'JUG-002', status: 'active', stock: 5, price: 38 },
];

const STATUS: Record<Status, [label: string, tone: BadgeTone]> = {
  active: ['Active', 'success'],
  draft: ['Draft', 'neutral'],
  archived: ['Archived', 'neutral'],
};

const TABS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['draft', 'Draft'],
  ['archived', 'Archived'],
] as const;

/** Stock in words, in a warning or critical colour when it runs low: the words carry the meaning. */
function stock(count: number): [text: string, tone: TextTone] {
  if (count === 0) return ['Out of stock', 'critical'];
  if (count < 10) return [`${String(count)} in stock`, 'warning'];
  return [`${String(count)} in stock`, 'secondary'];
}

/**
 * Figma 08's Pattern 1, Products: the content of the app shell's `<main>`. The page header and its
 * two actions, then the catalogue card: status filters as links (`TabNav`), a search form and a sort,
 * the product table with row selection, and pagination. `TableSelection` and the row checkboxes
 * submit the checked ids with the "Archive selected" form; the search, the sort and the pages are
 * URLs. Each thumbnail stands in for the product's `Image`.
 */
export function ProductsPageExample(): JSX.Element {
  return (
    <div className="nzp-products-page">
      <PageHeader
        level={2}
        title="Products"
        actions={
          <>
            <Button leadingIcon={<Upload />}>Import</Button>
            <Button variant="primary" leadingIcon={<Plus />}>
              Add product
            </Button>
          </>
        }
      />
      <Card.Root className="nzp-products-page-catalogue">
        <div className="nzp-products-page-toolbar">
          <TabNav.Root aria-label="Product status">
            {TABS.map(([value, label]) => (
              <TabNav.Link key={value} href={`?status=${value}`} current={value === 'all'}>
                {label}
              </TabNav.Link>
            ))}
          </TabNav.Root>
          <div className="nzp-products-page-filters">
            <form method="get" className="nzp-products-page-search">
              <SearchField
                name="q"
                placeholder="Search products"
                labels={{ label: 'Search products' }}
              />
            </form>
            <Button leadingIcon={<SlidersHorizontal />}>Filters</Button>
            <Select.Root defaultValue="updated" name="sort" aria-label="Sort products">
              <Select.Trigger />
              <Select.Popup>
                <Select.Item value="updated">Recently updated</Select.Item>
                <Select.Item value="name">Name, A to Z</Select.Item>
                <Select.Item value="stock">Lowest stock</Select.Item>
                <Select.Item value="price">Highest price</Select.Item>
              </Select.Popup>
            </Select.Root>
          </div>
        </div>
        <TableSelection>
          <form id="nzp-products-bulk" action="#" className="nzp-products-page-bulk">
            <Button type="submit" size="sm">
              Archive selected
            </Button>
          </form>
          <Table.Container className="nzp-products-page-table">
            <Table.Root>
              <Table.Caption visuallyHidden>Products</Table.Caption>
              <Table.Header>
                <Table.Row>
                  <Table.Head>
                    <TableSelectAll />
                  </Table.Head>
                  <Table.Head>Product</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Inventory</Table.Head>
                  <Table.Head numeric>Price</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {PRODUCTS.map((product) => {
                  const [label, tone] = STATUS[product.status];
                  const [stockText, stockTone] = stock(product.stock);
                  return (
                    <Table.Row key={product.id} interactive>
                      <Table.Cell>
                        <TableSelectRow
                          value={product.id}
                          form="nzp-products-bulk"
                          aria-label={`Select ${product.name}`}
                          defaultChecked={product.id === 'apron-002' || product.id === 'jug-002'}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="nzp-products-page-product">
                          <span className="nzp-products-page-thumb" aria-hidden="true" />
                          <span className="nzp-products-page-name">
                            <Table.RowLink href={`/products/${product.id}`}>
                              {product.name}
                            </Table.RowLink>
                            <Text render={<span />} variant="mono-m" tone="secondary">
                              {product.sku}
                            </Text>
                          </span>
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge tone={tone}>{label}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text render={<span />} tone={stockTone}>
                          {stockText}
                        </Text>
                      </Table.Cell>
                      <Table.Cell numeric>
                        <NumberValue value={product.price} format={USD} />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Table.Container>
        </TableSelection>
        <Pagination
          className="nzp-products-page-pagination"
          page={1}
          totalPages={13}
          size="sm"
          siblingCount={0}
          getHref={(page) => `?page=${String(page)}`}
          summary="Showing 1–20 of 248"
        />
      </Card.Root>
    </div>
  );
}

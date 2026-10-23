'use client';
// The live demos of the static-or-interactive guide's "In a client app": Pagination's button mode
// and Table sorting, both on React state, with no URL and no reload. The guide shows this code under
// each demo; keep the two in step.
import { useState, type JSX } from 'react';
import { Pagination } from '@nizivo/react/pagination';
import { Stack } from '@nizivo/react/stack';
import { Table, type TableSort } from '@nizivo/react/table';

const PRODUCTS = [
  { name: 'Stoneware mug', price: 28 },
  { name: 'Linen apron', price: 42 },
  { name: 'Ceramic coaster set', price: 18.5 },
  { name: 'Speckled bowl', price: 24 },
  { name: 'Oak serving board', price: 56 },
  { name: 'Glass carafe', price: 34 },
  { name: 'Cotton tea towel', price: 12 },
  { name: 'Brass bottle opener', price: 16 },
  { name: 'Walnut spoon', price: 9.5 },
] as const;

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const PER_PAGE = 3;

function ProductTable({ rows }: { rows: readonly (typeof PRODUCTS)[number][] }): JSX.Element {
  return (
    <Table.Body>
      {rows.map((product) => (
        <Table.Row key={product.name}>
          <Table.Cell>{product.name}</Table.Cell>
          <Table.Cell numeric>{MONEY.format(product.price)}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  );
}

/** Pagination on React state: `onPageChange` makes each page a button, so nothing navigates. */
export function ClientPagingDemo(): JSX.Element {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(PRODUCTS.length / PER_PAGE);
  const rows = PRODUCTS.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <Stack gap="3">
      <Table.Container>
        <Table.Root aria-label="Products, paged on the client">
          <Table.Header>
            <Table.Row>
              <Table.Head>Product</Table.Head>
              <Table.Head numeric>Price</Table.Head>
            </Table.Row>
          </Table.Header>
          <ProductTable rows={rows} />
        </Table.Root>
      </Table.Container>
      <Pagination page={page} totalPages={totalPages} size="sm" onPageChange={setPage} />
    </Stack>
  );
}

type Column = 'name' | 'price';

/** Sorting on React state: a SortButton without `href` is a button for your own handler. */
export function ClientSortDemo(): JSX.Element {
  const [column, setColumn] = useState<Column>('name');
  const [direction, setDirection] = useState<TableSort>('ascending');
  const sortBy = (next: Column): void => {
    setDirection(next === column && direction === 'ascending' ? 'descending' : 'ascending');
    setColumn(next);
  };
  const rows = PRODUCTS.toSorted((a, b) => {
    const order = column === 'name' ? a.name.localeCompare(b.name) : a.price - b.price;
    return direction === 'ascending' ? order : -order;
  });
  const sortOf = (c: Column): { sort?: TableSort } => (c === column ? { sort: direction } : {});
  return (
    <Table.Container>
      <Table.Root aria-label="Products, sorted on the client">
        <Table.Header>
          <Table.Row>
            <Table.Head {...sortOf('name')}>
              <Table.SortButton onClick={() => sortBy('name')}>Product</Table.SortButton>
            </Table.Head>
            <Table.Head numeric {...sortOf('price')}>
              <Table.SortButton onClick={() => sortBy('price')}>Price</Table.SortButton>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <ProductTable rows={rows} />
      </Table.Root>
    </Table.Container>
  );
}

import type { JSX } from 'react';
import { Button } from '../button/index';
import { Stack } from '../stack/index';
import { Table } from '../table/index';
import { TableSelectAll, TableSelection, TableSelectRow } from './index';

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const PRODUCTS = [
  ['mug-014', 'Stoneware mug', '124 in stock', 28],
  ['apron-002', 'Linen apron', '8 in stock', 42],
  ['coaster-007', 'Ceramic coaster set', 'Sold out', 18.5],
  ['bowl-021', 'Speckled bowl', '36 in stock', 24],
] as const;

/**
 * Bulk actions: each row's checkbox is a native input of the form above the table (`form`), so
 * "Archive" submits the checked ids even before JavaScript runs. `TableSelection` adds the
 * select-all box (checked, mixed or clear), Shift-click ranges and Escape to clear.
 */
export function TableSelectionExample(): JSX.Element {
  return (
    <Stack gap="3">
      <TableSelection>
        <form id="products-bulk" action="#">
          <Button type="submit" size="sm">
            Archive selected
          </Button>
        </form>
        <Table.Container>
          <Table.Root>
            <Table.Caption visuallyHidden>Products</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.Head>
                  <TableSelectAll />
                </Table.Head>
                <Table.Head>Product</Table.Head>
                <Table.Head>Inventory</Table.Head>
                <Table.Head numeric>Price</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {PRODUCTS.map(([id, name, stock, price]) => (
                <Table.Row key={id}>
                  <Table.Cell>
                    <TableSelectRow
                      value={id}
                      form="products-bulk"
                      aria-label={`Select ${name}`}
                      defaultChecked={id === 'apron-002'}
                    />
                  </Table.Cell>
                  <Table.Head scope="row">{name}</Table.Head>
                  <Table.Cell>{stock}</Table.Cell>
                  <Table.Cell numeric>{MONEY.format(price)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </TableSelection>
    </Stack>
  );
}

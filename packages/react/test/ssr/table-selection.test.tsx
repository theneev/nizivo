// Table's row selection on the server (ARCHITECTURE.md §16.2, D-cf): its own subpath, so
// @nizivo/react/table reaches no client module (test/ssr/table.test.tsx), and the checkboxes are
// native inputs that submit with their form before any JavaScript runs.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import { TableSelectionExample } from '../../src/table-selection/table-selection.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('TableSelection', () => {
  test('the subpath reaches exactly one client module, the island', () => {
    const { modules } = graph(SRC, 'src/table-selection/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/table-selection/table-selection.client.tsx',
    ]);
  });

  test('selection: native checkboxes that submit with their form, named, with no client markup', () => {
    const html = renderToString(<TableSelectionExample />);
    expect(html).toContain('<div data-slot="table-selection" class="nz-table-selection">');
    expect(html).toContain(
      '<label data-slot="table-select-all" class="nz-table-select-all nz-checkbox nz-hit-target"><input aria-label="Select all rows" type="checkbox"',
    );
    const row = /<input[^>]*value="apron-002"[^>]*>/.exec(html)?.[0] ?? '';
    for (const attribute of [
      'name="ids"',
      'form="products-bulk"',
      'aria-label="Select Linen apron"',
      'type="checkbox"',
      'class="nz-table-select-row-input nz-checkbox-input"',
      'checked=""',
    ]) {
      expect(row).toContain(attribute);
    }
  });
});

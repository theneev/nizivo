// Table's row selection in a real engine (ARCHITECTURE.md §16.2, D-cf): the server checkboxes
// submit with their form before hydration; hydrated, TableSelection adds the select-all's mixed
// state, Shift-click ranges and Escape, and a checked row shows bg/brand-subtle.
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Table } from '../../src/table/index';
import { BulkActionBar } from '../../src/bulk-action-bar/index';
import { TableSelectRow, TableSelection } from '../../src/table-selection/index';
import { TableSelectionExample } from '../../src/table-selection/table-selection.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/stack/stack.css',
    '../../src/table/table.css',
    '../../src/checkbox/checkbox.css',
    '../../src/table-selection/table-selection.css',
    '../../src/bulk-action-bar/bulk-action-bar.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 8)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
// the build expands @custom-media (tokens' custom-media.css); the raw sources need it done here
style.textContent = Object.values(STYLES).join('\n').replaceAll('(--nz-sm)', '(width >= 40rem)');
document.head.append(style);

beforeAll(async () => {
  await page.viewport(1280, 800);
});

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode, width: number): Promise<{ problems: unknown[] }> {
  const container = document.createElement('div');
  container.style.inlineSize = `${width}px`;
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(
    hydrateRoot(container, app, {
      onRecoverableError: (error: unknown) => problems.push(error),
    }),
  );
  await settle();
  return { problems };
}

const inputs = (slot: string): HTMLInputElement[] => [
  ...document.querySelectorAll<HTMLInputElement>(`[data-slot="${slot}-input"]`),
];

/** The checked row ids a submit of the bulk form would send. */
function submitted(): string[] {
  const form = document.querySelector('form');
  if (form === null) throw new Error('no form');
  return new FormData(form).getAll('ids').map(String);
}

describe('Table selection', () => {
  test('before hydration: the server checkboxes already submit with their form', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<TableSelectionExample />);
    document.body.append(container);
    expect(submitted()).toEqual(['apron-002']);
    const [first] = inputs('table-select-row');
    if (first === undefined) throw new Error('no row');
    await userEvent.click(first);
    expect(submitted()).toEqual(['mug-014', 'apron-002']);
    // no island yet: the select-all box is a plain checkbox, and the bar's count stays at the
    // server's defaultCount
    expect(inputs('table-select-all')[0]?.indeterminate).toBe(false);
    expect(document.querySelector('[data-slot="bulk-action-bar-count"]')?.textContent).toBe(
      '1 selected',
    );
  });

  test('BulkActionBar: the island writes the count and keeps it in step, announced politely', async () => {
    await hydrate(<TableSelectionExample />, 980);
    const count = document.querySelector<HTMLElement>('[data-slot="bulk-action-bar-count"]');
    if (count === null) throw new Error('no count');
    expect(count.hidden).toBe(false);
    expect(count.textContent).toBe('1 selected');
    expect(count.getAttribute('aria-live')).toBe('polite');
    const [selectAll] = inputs('table-select-all');
    if (selectAll === undefined) throw new Error('no select-all');
    await userEvent.click(selectAll);
    expect(count.textContent).toBe('4 selected');
    await userEvent.click(selectAll);
    expect(count.textContent).toBe('0 selected');
    // the bar stays where it is with nothing selected
    expect(count.closest('[data-slot="bulk-action-bar"]')?.checkVisibility()).toBe(true);
  });

  test('BulkActionBar: labels and locale shape the count', async () => {
    await hydrate(
      <TableSelection>
        <BulkActionBar labels={{ selected: '{count} ausgewählt' }} locale="de-DE" />
        <table>
          <tbody>
            <tr>
              <td>
                <TableSelectRow value="a" aria-label="A" defaultChecked />
              </td>
            </tr>
          </tbody>
        </table>
      </TableSelection>,
      600,
    );
    const count = document.querySelector<HTMLElement>('[data-slot="bulk-action-bar-count"]');
    expect(count?.textContent).toBe('1 ausgewählt');
    expect(count?.lang).toBe('de-DE');
  });

  test('hydrated: the select-all box is mixed, then checks and clears every row', async () => {
    const { problems } = await hydrate(<TableSelectionExample />, 980);
    expect(problems).toEqual([]);
    const [selectAll] = inputs('table-select-all');
    if (selectAll === undefined) throw new Error('no select-all');
    expect(selectAll.indeterminate).toBe(true);
    await userEvent.click(selectAll);
    expect(submitted()).toEqual(['mug-014', 'apron-002', 'coaster-007', 'bowl-021']);
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);
    await userEvent.click(selectAll);
    expect(submitted()).toEqual([]);
    expect(selectAll.checked).toBe(false);
  });

  test('Shift-click selects the range; a checked row shows bg/brand-subtle', async () => {
    await hydrate(<TableSelectionExample />, 980);
    const rows = inputs('table-select-row');
    const [first, , , fourth] = rows;
    if (first === undefined || fourth === undefined) throw new Error('no rows');
    await userEvent.click(first);
    await userEvent.keyboard('{Shift>}');
    await userEvent.click(fourth);
    await userEvent.keyboard('{/Shift}');
    expect(submitted()).toEqual(['mug-014', 'apron-002', 'coaster-007', 'bowl-021']);
    const row = first.closest('tr');
    const probe = document.createElement('div');
    probe.style.background = 'var(--nz-bg-brand-subtle)';
    document.body.append(probe);
    expect(row && getComputedStyle(row).backgroundColor).toBe(
      getComputedStyle(probe).backgroundColor,
    );
  });

  test('Escape in the table clears the selection, and only then stops', async () => {
    const outer = vi.fn<() => void>();
    document.addEventListener('keydown', outer);
    await hydrate(<TableSelectionExample />, 980);
    const [first] = inputs('table-select-row');
    if (first === undefined) throw new Error('no row');
    first.focus();
    await userEvent.keyboard('{Escape}');
    expect(submitted()).toEqual([]);
    expect(outer).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(outer).toHaveBeenCalledOnce();
    document.removeEventListener('keydown', outer);
  });

  test('onSelectionChange hears every change with the selected values', async () => {
    const changes: string[][] = [];
    await hydrate(
      <TableSelection onSelectionChange={(ids) => changes.push(ids)}>
        <Table.Container>
          <Table.Root aria-label="Products">
            <Table.Body>
              <Table.Row>
                <Table.Cell>
                  <TableSelectRow value="a" aria-label="Select A" />
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </TableSelection>,
      600,
    );
    const [box] = inputs('table-select-row');
    if (box === undefined) throw new Error('no row');
    await userEvent.click(box);
    await userEvent.click(box);
    // nothing on mount: no row was checked
    expect(changes).toEqual([['a'], []]);
  });
});

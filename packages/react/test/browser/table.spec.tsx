// Table and PageHeader in a real engine (ARCHITECTURE.md §16.2; Figma Order Row 7275:14091, 08's
// page header): the server HTML hydrates unchanged; an interactive row's stretched link covers the
// whole row, and a control in the row stays above it; numbers are end-aligned in tabular figures;
// the sort arrow follows the <th>; the page header's title is Heading/H1, and Heading/H2's size with
// the actions on their own row below --nz-sm.
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Button } from '../../src/button/index';
import { PageHeader } from '../../src/page-header/index';
import { Table } from '../../src/table/index';
import { TableOrdersExample, TableSortExample } from '../../src/table/table.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/avatar/avatar.css',
    '../../src/badge/badge.css',
    '../../src/inline/inline.css',
    '../../src/page-header/page-header.css',
    '../../src/table/table.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 8)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
// the build expands @custom-media (tokens' custom-media.css); the raw sources need it done here
style.textContent = Object.values(STYLES).join('\n').replaceAll('(--nz-sm)', '(width >= 40rem)');
document.head.append(style);

// a desktop viewport: the hit tests read points across a 980 px table
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

const all = (slot: string): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`),
];
const get = (slot: string): HTMLElement => {
  const found = all(slot)[0];
  if (found === undefined) throw new Error(`no ${slot}`);
  return found;
};

/** The element at a point, as a pointer would find it. */
const at = (x: number, y: number): Element | null => document.elementFromPoint(x, y);

/** How many of a header cell's sort glyphs are drawn. */
const visible = (head: HTMLElement): number =>
  [...head.querySelectorAll('svg')].filter((svg) => svg.getBoundingClientRect().width > 0).length;

describe('Table', () => {
  test('hydrates unchanged; a native table named by its caption, no grid role', async () => {
    const { problems } = await hydrate(<TableOrdersExample />, 980);
    expect(problems).toEqual([]);
    const table = get('table');
    expect(table.tagName).toBe('TABLE');
    expect(table.getAttribute('role')).toBeNull();
    expect(get('table-caption').textContent).toBe('Recent orders');
    // the caption is the name, but hidden from sight
    expect(get('table-caption').getBoundingClientRect().height).toBeLessThanOrEqual(1);
  });

  test('an interactive row: anywhere in it is its link, and only its link', async () => {
    await hydrate(<TableOrdersExample />, 980);
    const row = all('table-row')[1];
    const link = all('table-row-link')[0];
    if (row === undefined || link === undefined) throw new Error('no row');
    expect(row.hasAttribute('data-interactive')).toBe(true);
    const box = row.getBoundingClientRect();
    // the end of the row (the Total cell) and the middle both hit the link
    for (const x of [box.left + box.width / 2, box.right - 8]) {
      expect(at(x, box.top + box.height / 2)).toBe(link);
    }
    // the row above (the header) does not
    const header = all('table-row')[0]?.getBoundingClientRect();
    if (header === undefined) throw new Error('no header');
    expect(at(header.left + header.width / 2, header.top + header.height / 2)).not.toBe(link);
  });

  test('a control in an interactive row stays above the link', async () => {
    const onClick = vi.fn<() => void>();
    await hydrate(
      <Table.Container>
        <Table.Root aria-label="Orders">
          <Table.Body>
            <Table.Row interactive>
              <Table.Cell>
                <Table.RowLink href="#order-1042">#1042</Table.RowLink>
              </Table.Cell>
              <Table.Cell>
                <Button size="sm" onClick={onClick}>
                  Refund
                </Button>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Table.Container>,
      600,
    );
    const button = document.querySelector('button');
    if (button === null) throw new Error('no button');
    const box = button.getBoundingClientRect();
    expect(button.contains(at(box.left + box.width / 2, box.top + box.height / 2))).toBe(true);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('Figma’s row: 12 / 20 padding; numbers end-aligned in tabular figures', async () => {
    await hydrate(<TableOrdersExample />, 980);
    const cell = getComputedStyle(get('table-cell'));
    expect(cell.paddingTop).toBe('12px');
    expect(cell.paddingInlineStart).toBe('20px');
    const total = all('table-cell').find((element) => element.hasAttribute('data-numeric'));
    if (total === undefined) throw new Error('no numeric cell');
    expect(getComputedStyle(total).textAlign).toBe('end');
    expect(getComputedStyle(total).fontVariantNumeric).toBe('tabular-nums');
  });

  test('the sort arrow follows the <th>: one chevron when sorted, both ways when not', async () => {
    await hydrate(<TableSortExample />, 980);
    const heads = all('table-head').slice(0, 3);
    expect(heads.map((head) => head.getAttribute('aria-sort'))).toEqual([null, null, 'descending']);
    expect(heads.map(visible)).toEqual([1, 1, 1]);
    const sorted = heads[2]?.querySelector('svg:last-child');
    if (!(sorted instanceof SVGElement)) throw new Error('no chevron');
    expect(getComputedStyle(sorted).rotate).toBe('90deg');
    expect(get('table-sort-button').tagName).toBe('A');
  });

  test('a labelled container takes focus, with the ring, and scrolls from the keyboard', async () => {
    await hydrate(
      <Table.Container label="Inventory">
        <Table.Root aria-label="Inventory">
          <Table.Body>
            <Table.Row>
              {Array.from({ length: 12 }, (_, i) => (
                <Table.Cell key={i}>Warehouse {i + 1}: 124 in stock</Table.Cell>
              ))}
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Table.Container>,
      360,
    );
    const container = get('table-container');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(container);
    expect(getComputedStyle(container).outlineStyle).toBe('solid');
    // Playwright's WebKit does not scroll the focused region on arrow keys (week 17: 4 runs of 4;
    // one earlier run did); Chromium and Firefox do. Real Safari is unverified.
    if (/AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) return;
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await expect.poll(() => container.scrollLeft).toBeGreaterThan(0);
  });

  test('a wide table scrolls inside its container, not the page', async () => {
    await hydrate(<TableOrdersExample />, 360);
    const container = get('table-container');
    expect(container.scrollWidth).toBeGreaterThan(container.clientWidth);
    expect(container.getBoundingClientRect().width).toBeLessThanOrEqual(360);
  });

  // GitHub #1: the container is the containing block of what sits in it, so a visually hidden
  // (absolutely positioned) header in a column past the screen's edge scrolls with the table and
  // never widens the page, which a phone would zoom out to fit
  test('a visually hidden header in an off-screen column leaves the page its width', async () => {
    await page.viewport(390, 844);
    try {
      const columns = Array.from({ length: 8 }, (_, i) => `Column ${i + 1}`);
      await hydrate(
        <Table.Container>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                {columns.map((column) => (
                  <Table.Head key={column}>{column}</Table.Head>
                ))}
                <Table.Head>
                  <span className="nz-visually-hidden">Actions</span>
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                {columns.map((column) => (
                  <Table.Cell key={column}>Some cell text</Table.Cell>
                ))}
                <Table.Cell>Send again</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Table.Container>,
        358,
      );
      const container = get('table-container');
      expect(container.scrollWidth).toBeGreaterThan(container.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    } finally {
      await page.viewport(1280, 800);
    }
  });
});

/** The font size a `font` shorthand value computes to. */
function sizeOf(font: string): string {
  const probe = document.createElement('div');
  probe.style.font = font;
  document.body.append(probe);
  const size = getComputedStyle(probe).fontSize;
  probe.remove();
  return size;
}

describe('PageHeader', () => {
  const header = (
    <PageHeader
      title="Good morning, Maya"
      actions={
        <>
          <Button>Export</Button>
          <Button variant="primary">New order</Button>
        </>
      }
    />
  );

  test('wide: Heading/H1 and the actions on the title’s row, at its end', async () => {
    await hydrate(header, 980);
    const title = get('page-header-title');
    const actions = get('page-header-actions').getBoundingClientRect();
    expect(getComputedStyle(title).fontSize).toBe(sizeOf('var(--nz-font-heading-h1)'));
    const box = title.getBoundingClientRect();
    expect(
      Math.abs(box.top + box.height / 2 - (actions.top + actions.height / 2)),
    ).toBeLessThanOrEqual(1);
    expect(Math.round(actions.right)).toBe(
      Math.round(get('page-header').getBoundingClientRect().right),
    );
  });

  test('narrow: Heading/H2’s size, and the actions on a row of their own', async () => {
    await page.viewport(360, 800);
    await hydrate(header, 360);
    const title = get('page-header-title');
    expect(getComputedStyle(title).fontSize).toBe(sizeOf('var(--nz-font-heading-h2)'));
    expect(sizeOf('var(--nz-font-heading-h2)')).not.toBe(sizeOf('var(--nz-font-heading-h1)'));
    expect(get('page-header-actions').getBoundingClientRect().top).toBeGreaterThanOrEqual(
      title.getBoundingClientRect().bottom,
    );
    await page.viewport(1280, 800);
  });
});

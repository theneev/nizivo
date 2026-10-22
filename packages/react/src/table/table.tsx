// NO directive: every part is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5, §16.2). A native
// <table>, never role="grid": the page is the state, so sorting and paging go through the URL
// (`render={<Link/>}` on Table.SortButton and Pagination) and no client data engine is involved.
// Figma: Order Row 7275:14091 and Product Row 7275:14040 (figma/05 §3.3, §3.4), their orphan
// headers 753:599 and 753:410; 08's "Recent orders" puts one in a card, radius 12 with a
// border/subtle stroke (figma/08 §4.1). Row selection (a form-based island, §16.2) is not built yet.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { ChevronGlyph, ChevronsUpDownGlyph } from '../_internal/glyphs';

type Empty = Record<string, never>;

export type TableSort = 'ascending' | 'descending';

export interface TableContainerProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Empty>;
}

export interface TableRootProps extends ComponentPropsWithRef<'table'> {
  render?: RenderProp<Empty>;
}

export interface TableCaptionProps extends ComponentPropsWithRef<'caption'> {
  /**
   * Keeps the caption as the table's accessible name but hides it from sight, for a table whose
   * card already shows a heading. @default false
   */
  visuallyHidden?: boolean;
  render?: RenderProp<Empty>;
}

export interface TableSectionProps extends ComponentPropsWithRef<'tbody'> {
  render?: RenderProp<Empty>;
}

export interface TableRowState {
  selected: boolean;
  interactive: boolean;
}

export interface TableRowProps extends ComponentPropsWithRef<'tr'> {
  /** `data-selected` (never `aria-selected` inside a table, §16.2). @default false */
  selected?: boolean;
  /**
   * The whole row is the hit area of its `Table.RowLink` (a stretched link) and shows Figma's hover.
   * Other controls in the row stay above the link. @default false
   */
  interactive?: boolean;
  render?: RenderProp<TableRowState>;
}

export interface TableHeadState {
  sort: TableSort | undefined;
  numeric: boolean;
}

export interface TableHeadProps extends ComponentPropsWithRef<'th'> {
  /** The column's current sort: `aria-sort` and `data-sort` on the `<th>`. */
  sort?: TableSort;
  /** A column of numbers: end-aligned, tabular figures. @default false */
  numeric?: boolean;
  /** `row` for a row header in the body. @default 'col' */
  scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
  render?: RenderProp<TableHeadState>;
}

export interface TableCellState {
  numeric: boolean;
}

export interface TableCellProps extends ComponentPropsWithRef<'td'> {
  /** A number: end-aligned, tabular figures. @default false */
  numeric?: boolean;
  render?: RenderProp<TableCellState>;
}

export interface TableSortButtonProps extends ComponentPropsWithRef<'button'> {
  /**
   * The same page sorted by this column, for example `href="?sort=-total"`: the part renders an
   * `<a>`, and the URL holds the state. With neither `href` nor `render` it is a
   * `<button type="button">` for your own handler.
   */
  href?: string;
  /** The router's link, for example `render={<Link href="?sort=-total" />}`. */
  render?: RenderProp<Empty>;
}

export interface TableRowLinkProps extends ComponentPropsWithRef<'a'> {
  /** The router's link, for example `render={<Link href="/orders/1042" />}`. It must render an `<a>`. */
  render?: RenderProp<Empty>;
}

/** The table's box: the border, the radius and the horizontal scroll of a wide table. */
export function TableContainer({ render, className, ...rest }: TableContainerProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    { 'data-slot': 'table-container', ...rest, className: cx('nz-table-container', className) },
  );
}

export function TableRoot({ render, className, ...rest }: TableRootProps): ReactElement {
  return renderElement(
    'table',
    render,
    {},
    { 'data-slot': 'table', ...rest, className: cx('nz-table', className) },
  );
}

/** The table's name. Give every table one: a caption, or `aria-labelledby` to a visible heading. */
export function TableCaption({
  visuallyHidden = false,
  render,
  className,
  ...rest
}: TableCaptionProps): ReactElement {
  return renderElement(
    'caption',
    render,
    {},
    {
      'data-slot': 'table-caption',
      ...rest,
      className: cx('nz-table-caption', visuallyHidden && 'nz-visually-hidden', className),
    },
  );
}

export function TableHeader({ render, className, ...rest }: TableSectionProps): ReactElement {
  return renderElement(
    'thead',
    render,
    {},
    { 'data-slot': 'table-header', ...rest, className: cx('nz-table-header', className) },
  );
}

export function TableBody({ render, className, ...rest }: TableSectionProps): ReactElement {
  return renderElement(
    'tbody',
    render,
    {},
    { 'data-slot': 'table-body', ...rest, className: cx('nz-table-body', className) },
  );
}

export function TableFooter({ render, className, ...rest }: TableSectionProps): ReactElement {
  return renderElement(
    'tfoot',
    render,
    {},
    { 'data-slot': 'table-footer', ...rest, className: cx('nz-table-footer', className) },
  );
}

export function TableRow({
  selected = false,
  interactive = false,
  render,
  className,
  ...rest
}: TableRowProps): ReactElement {
  return renderElement(
    'tr',
    render,
    { selected, interactive },
    {
      'data-slot': 'table-row',
      'data-selected': selected ? '' : undefined,
      'data-interactive': interactive ? '' : undefined,
      ...rest,
      className: cx('nz-table-row', className),
    },
  );
}

export function TableHead({
  sort,
  numeric = false,
  scope = 'col',
  render,
  className,
  ...rest
}: TableHeadProps): ReactElement {
  return renderElement(
    'th',
    render,
    { sort, numeric },
    {
      'data-slot': 'table-head',
      'data-sort': sort,
      'data-numeric': numeric ? '' : undefined,
      'aria-sort': sort,
      scope,
      ...rest,
      className: cx('nz-table-head', className),
    },
  );
}

export function TableCell({
  numeric = false,
  render,
  className,
  ...rest
}: TableCellProps): ReactElement {
  return renderElement(
    'td',
    render,
    { numeric },
    {
      'data-slot': 'table-cell',
      'data-numeric': numeric ? '' : undefined,
      ...rest,
      className: cx('nz-table-cell', className),
    },
  );
}

/**
 * The column's label as a control. Its arrow follows the `sort` of the `Table.Head` it sits in
 * (up for ascending, down for descending, both ways when unsorted) through CSS, so it needs no
 * client code; the `<th>`'s `aria-sort` tells assistive technology the current order.
 */
export function TableSortButton({
  href,
  render,
  className,
  children,
  ...rest
}: TableSortButtonProps): ReactElement {
  const link = href !== undefined || render !== undefined;
  return renderElement(
    href === undefined ? 'button' : 'a',
    render,
    {},
    {
      'data-slot': 'table-sort-button',
      href,
      type: link ? undefined : 'button',
      ...rest,
      className: cx('nz-table-sort-button', 'nz-hit-target', className),
      children: (
        <>
          {children}
          <span className="nz-table-sort-icon" data-slot="table-sort-icon" aria-hidden="true">
            <ChevronsUpDownGlyph />
            <ChevronGlyph />
          </span>
        </>
      ),
    },
  );
}

/**
 * A row's link, usually its first cell's text (Figma Order Row: the order number). In a row with
 * `interactive`, it stretches over the whole row.
 */
export function TableRowLink({ render, className, ...rest }: TableRowLinkProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    { 'data-slot': 'table-row-link', ...rest, className: cx('nz-table-row-link', className) },
  );
}

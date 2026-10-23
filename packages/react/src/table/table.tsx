// NO directive: every part is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5, §16.2). A native
// <table>, never role="grid": the page is the state, so sorting and paging go through the URL
// (`render={<Link/>}` on Table.SortButton and Pagination) and no client data engine is involved.
// Figma: Order Row 7275:14091 and Product Row 7275:14040 (figma/05 §3.3, §3.4), their orphan
// headers 753:599 and 753:410; 08's "Recent orders" puts one in a card, radius 12 with a
// border/subtle stroke (figma/08 §4.1). Row selection is form-based (§16.2): Table.SelectRow and
// Table.SelectAll are native checkboxes rendered here, on the server, so the selected ids reach a
// form's FormData before any JavaScript runs; Table.Selection (table-selection.client.tsx) is the one
// client part, which adds the select-all's mixed state, Shift-click ranges and Escape.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CheckGlyph, ChevronGlyph, ChevronsUpDownGlyph, MinusGlyph } from '../_internal/glyphs';

type Empty = Record<string, never>;

export type TableSort = 'ascending' | 'descending';

export interface TableContainerProps extends ComponentPropsWithRef<'div'> {
  /**
   * Names the container as a scrollable region and puts it in the Tab order, so a keyboard can
   * scroll a table wider than the screen (Safari and Firefox do not focus a scroller on their own).
   * Give it when the table can scroll sideways and its rows hold no link or control.
   */
  label?: string;
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
export function TableContainer({
  label,
  render,
  className,
  ...rest
}: TableContainerProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'table-container',
      ...(label === undefined ? {} : { role: 'region', 'aria-label': label, tabIndex: 0 }),
      ...rest,
      className: cx('nz-table-container', className),
    },
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

/** Table's own strings (§16.4): serialisable, English defaults. */
export interface TableLabels {
  /** The select-all checkbox's name. @default 'Select all rows' */
  selectAll: string;
}

type CheckboxInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'children' | 'checked' | 'defaultChecked'
>;

export interface TableSelectAllProps extends CheckboxInputProps {
  /** An `aria-label` wins over `labels.selectAll`. */
  labels?: Partial<TableLabels>;
}

export interface TableSelectRowProps extends CheckboxInputProps {
  /** The row's id: what a form receives under `name` when the row is selected. */
  value: string;
  /** The checkbox's name, unique per row, for example "Select order 1042". */
  'aria-label': string;
  /** @default 'ids' */
  name?: string;
  /** Selected when the page loads. @default false */
  defaultChecked?: boolean;
}

// Both checkboxes write Checkbox's markup (checkbox.css draws it) without its client module: the box
// is a native input, so it works, and submits, before any JavaScript runs.

/**
 * The header's checkbox: checks or clears every row of its `Table.Selection`, and shows the mixed
 * state when some are selected. It submits nothing. Without `Table.Selection` it does nothing.
 */
export function TableSelectAll({ labels, className, ...rest }: TableSelectAllProps): ReactElement {
  return (
    <label
      data-slot="table-select-all"
      className={cx('nz-table-select-all nz-checkbox nz-hit-target', className)}
    >
      <input
        aria-label={labels?.selectAll ?? 'Select all rows'}
        {...rest}
        type="checkbox"
        className="nz-table-select-all-input nz-checkbox-input"
        data-slot="table-select-all-input"
      />
      <span
        className="nz-table-select-all-indicator nz-checkbox-indicator"
        data-slot="table-select-all-indicator"
        aria-hidden="true"
      >
        <CheckGlyph />
        <MinusGlyph />
      </span>
    </label>
  );
}

/**
 * A row's checkbox: a native input that submits `value` under `name` with its form (pass `form` to
 * reach a form outside the table). The row shows `bg/brand-subtle` while it is checked, through CSS.
 */
export function TableSelectRow({
  name = 'ids',
  className,
  ...rest
}: TableSelectRowProps): ReactElement {
  return (
    <label
      data-slot="table-select-row"
      className={cx('nz-table-select-row nz-checkbox nz-hit-target', className)}
    >
      <input
        name={name}
        {...rest}
        type="checkbox"
        className="nz-table-select-row-input nz-checkbox-input"
        data-slot="table-select-row-input"
      />
      <span
        className="nz-table-select-row-indicator nz-checkbox-indicator"
        data-slot="table-select-row-indicator"
        aria-hidden="true"
      >
        <CheckGlyph />
        <MinusGlyph />
      </span>
    </label>
  );
}

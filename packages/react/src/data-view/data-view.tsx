// NO directive: DataView is server-safe, 0 KB of client JS (ARCHITECTURE.md §16.2; Figma's Order
// List Item 764:3483 for the list rows, and 08 Responsive 7275:18740, which draws the same orders as
// table rows on a wide screen and as list rows on a narrow one). The server renders both
// presentations and a container query on the root shows one: the table from 40rem (`sm`) of its own
// width, the list below. The other is `display: none`, so it is out of the accessibility tree and
// the tab order, and no script measures anything, so the server HTML is final.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

type NoState = Record<string, never>;

export interface DataViewRootProps extends ComponentPropsWithRef<'div'> {
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
  /** A `DataView.Table`, then a `DataView.List`, holding the same records. */
  children?: ReactNode;
}

export interface DataViewTableProps extends ComponentPropsWithRef<'div'> {
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
  /** The wide presentation: a `Table.Container` with its table. */
  children?: ReactNode;
}

export interface DataViewListProps extends ComponentPropsWithRef<'ul'> {
  /** Must render a `<ul>` or an `<ol>`. */
  render?: RenderProp<NoState>;
  /** The narrow presentation: `DataView.Item` rows. */
  children?: ReactNode;
}

export interface DataViewItemProps extends ComponentPropsWithRef<'li'> {
  /**
   * The whole row is the hit area of its `DataView.ItemLink` (a stretched link) and shows the hover
   * fill; other controls in it stay clickable above the link.
   * @default false
   */
  interactive?: boolean;
  /** Must render an `<li>`. */
  render?: RenderProp<NoState>;
}

export interface DataViewItemLinkProps extends ComponentPropsWithRef<'a'> {
  /** Must render an `<a>`, or a router's link component that renders one. */
  render?: RenderProp<NoState>;
}

export function DataViewRoot({ render, className, ...rest }: DataViewRootProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    { 'data-slot': 'data-view', ...rest, className: cx('nz-data-view', className) },
  );
}

export function DataViewTable({ render, className, ...rest }: DataViewTableProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'data-view-table',
      'data-presentation': 'table',
      ...rest,
      className: cx('nz-data-view-table', className),
    },
  );
}

export function DataViewList({ render, className, ...rest }: DataViewListProps): ReactElement {
  return renderElement(
    'ul',
    render,
    {},
    {
      'data-slot': 'data-view-list',
      'data-presentation': 'list',
      // Safari drops the list role of a list without markers
      role: 'list',
      ...rest,
      className: cx('nz-data-view-list', className),
    },
  );
}

export function DataViewItem({
  interactive = false,
  render,
  className,
  ...rest
}: DataViewItemProps): ReactElement {
  return renderElement(
    'li',
    render,
    {},
    {
      'data-slot': 'data-view-item',
      'data-interactive': interactive ? '' : undefined,
      ...rest,
      className: cx('nz-data-view-item', className),
    },
  );
}

export function DataViewItemLink({
  render,
  className,
  ...rest
}: DataViewItemLinkProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'data-view-item-link',
      ...rest,
      className: cx('nz-data-view-item-link', className),
    },
  );
}

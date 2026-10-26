// NO directive: BulkActionBar is server-safe (ARCHITECTURE.md §16.2, D-da): the bar over a selectable
// table, with how many rows are selected and the actions. TableSelection's island
// (@nizivo/react/table-selection) writes the count; this module ships no client code of its own.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** BulkActionBar's own strings (§16.4): serialisable, English defaults. */
export interface BulkActionBarLabels {
  /** The count of selected rows, with `{count}`. @default '{count} selected' */
  selected: string;
}

export interface BulkActionBarProps extends ComponentPropsWithRef<'div'> {
  /** `labels.selected` sets the count's text, for example `'{count} ausgewählt'`. */
  labels?: Partial<BulkActionBarLabels>;
  /** BCP 47 tag for the count's number and language. @default 'en-US' */
  locale?: string;
  /**
   * How many rows are selected when the page renders (its `defaultChecked` rows): the server then
   * writes the count, and hydration leaves it as it is. Without it, the count shows once the island
   * runs.
   */
  defaultCount?: number;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
  /** The actions: buttons of the form the rows' checkboxes belong to, for example. */
  children?: ReactNode;
}

/**
 * The bar over a selectable table (D-da): how many rows are selected, then the actions. Place it
 * inside `TableSelection`, whose island writes the count ("2 selected") as the selection changes and
 * announces it (`aria-live`); before hydration the count is hidden and the actions already work,
 * because they submit the form the rows' checkboxes belong to. It stays in place with no rows
 * selected, so selecting the first one does not move the table.
 */
export function BulkActionBar({
  labels,
  locale = 'en-US',
  defaultCount,
  render,
  className,
  children,
  ...rest
}: BulkActionBarProps): ReactElement {
  const template = labels?.selected ?? '{count} selected';
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'bulk-action-bar',
      ...rest,
      className: cx('nz-bulk-action-bar', className),
      children: (
        <>
          <span
            className="nz-bulk-action-bar-count"
            data-slot="bulk-action-bar-count"
            aria-live="polite"
            lang={locale}
            hidden={defaultCount === undefined}
          >
            {defaultCount === undefined ? '' : countText(template, defaultCount, locale)}
          </span>
          {/* what the island writes the count from, as the selection changes */}
          <span className="nz-bulk-action-bar-template" data-slot="bulk-action-bar-template" hidden>
            {template}
          </span>
          <div className="nz-bulk-action-bar-actions" data-slot="bulk-action-bar-actions">
            {children}
          </div>
        </>
      ),
    },
  );
}

/** The count's text: the template with `{count}` as a number in the locale (the island's rule too). */
function countText(template: string, count: number, locale: string): string {
  return template.replaceAll('{count}', new Intl.NumberFormat(locale).format(count));
}

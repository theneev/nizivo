// NO directive: the checkboxes are server-safe (ARCHITECTURE.md §9.5, §16.2; D-cf). Row selection is
// form-based: TableSelectRow and TableSelectAll are native checkboxes rendered on the server, so the
// selected ids reach a form's FormData before any JavaScript runs; TableSelection
// (table-selection.client.tsx) is the one client part, which adds the select-all's mixed state,
// Shift-click ranges and Escape. A subpath of its own, so a page that imports @nizivo/react/table
// ships no client module under webpack either (week 18). The island also writes the count of a
// BulkActionBar (@nizivo/react/bulk-action-bar, D-da) inside it.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { cx } from '../_internal/cx';
import { CheckGlyph, MinusGlyph } from '../_internal/glyphs';

/** Row selection's own strings (§16.4): serialisable, English defaults. */
export interface TableSelectionLabels {
  /** The select-all checkbox's name. @default 'Select all rows' */
  selectAll: string;
}

type CheckboxInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'children' | 'checked' | 'defaultChecked'
>;

export interface TableSelectAllProps extends CheckboxInputProps {
  /** An `aria-label` wins over `labels.selectAll`. */
  labels?: Partial<TableSelectionLabels>;
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
 * The header's checkbox: checks or clears every row of its `TableSelection`, and shows the mixed
 * state when some are selected. It submits nothing. Without `TableSelection` it does nothing.
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

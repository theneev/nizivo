'use client';
// Table's one client part (ARCHITECTURE.md §16.2, gap report A §3.6): a form-based selection island.
// The row checkboxes (Table.SelectRow) are native inputs rendered on the server, so a form receives
// the selected ids before this module runs; one listener on this element's subtree adds what a
// native checkbox cannot do: the select-all's checked and mixed state, checking every row from it,
// Shift-click ranges, and Escape to clear. No per-row hydration: a table of 500 rows has one island.
import { useEffect, useRef, type ComponentPropsWithRef, type ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

export interface TableSelectionProps extends Omit<ComponentPropsWithRef<'div'>, 'ref'> {
  /**
   * The selected rows' values, after every change (and once on mount when a row is already
   * checked, for example by the browser's form restoration). For a client owner; a Server Component
   * reads the selection from the form.
   */
  onSelectionChange?: (ids: string[]) => void;
  render?: RenderProp<Record<string, never>>;
}

const ROW = '[data-slot="table-select-row-input"]';
const ALL = '[data-slot="table-select-all-input"]';

export function TableSelection({
  onSelectionChange,
  render,
  className,
  ...rest
}: TableSelectionProps): ReactElement {
  const root = useRef<HTMLDivElement | null>(null);
  const report = useRef(onSelectionChange);
  useEffect(() => {
    report.current = onSelectionChange;
  });

  useEffect(() => {
    const element = root.current;
    if (element === null) return undefined;
    const rows = (): HTMLInputElement[] => [...element.querySelectorAll<HTMLInputElement>(ROW)];
    let last = '';
    let anchor: HTMLInputElement | undefined;
    let shift = false;

    /** The select-all boxes follow the rows; the owner hears of a changed selection. */
    const sync = (): void => {
      const all = rows().filter((input) => !input.disabled);
      const checked = all.filter((input) => input.checked);
      for (const box of element.querySelectorAll<HTMLInputElement>(ALL)) {
        box.checked = all.length > 0 && checked.length === all.length;
        box.indeterminate = checked.length > 0 && checked.length < all.length;
      }
      const ids = rows()
        .filter((input) => input.checked)
        .map((input) => input.value);
      const key = ids.join('\u0000');
      if (key !== last) {
        last = key;
        report.current?.(ids);
      }
    };

    const onClick = (event: MouseEvent): void => {
      shift = event.shiftKey;
    };
    const onChange = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.matches(ALL)) {
        for (const input of rows()) if (!input.disabled) input.checked = target.checked;
        anchor = undefined;
      } else if (target.matches(ROW)) {
        const list = rows();
        // Shift-click: every row between the last row clicked and this one takes this one's state
        if (shift && anchor !== undefined && anchor !== target && list.includes(anchor)) {
          const [a, b] = [list.indexOf(anchor), list.indexOf(target)];
          for (const input of list.slice(Math.min(a, b), Math.max(a, b) + 1)) {
            if (!input.disabled) input.checked = target.checked;
          }
        }
        anchor = target;
      } else {
        return;
      }
      shift = false;
      sync();
    };
    // Escape clears the selection, and stops there only when there was one to clear: otherwise it
    // goes on to whatever else listens (a Dialog around the table closes).
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const checked = rows().filter((input) => input.checked && !input.disabled);
      if (checked.length === 0) return;
      for (const input of checked) input.checked = false;
      event.preventDefault();
      event.stopPropagation();
      anchor = undefined;
      sync();
    };

    element.addEventListener('click', onClick, true);
    element.addEventListener('change', onChange);
    element.addEventListener('keydown', onKeyDown);
    sync();
    return () => {
      element.removeEventListener('click', onClick, true);
      element.removeEventListener('change', onChange);
      element.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return renderElement(
    'div',
    render,
    {},
    // The ref object goes to the element; nothing reads it in render (the effect above does).
    // oxlint-disable-next-line react/refs
    {
      'data-slot': 'table-selection',
      ref: root,
      ...rest,
      className: cx('nz-table-selection', className),
    },
  );
}

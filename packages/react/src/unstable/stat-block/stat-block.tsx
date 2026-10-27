// NO directive: StatBlock is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp; Figma's
// Stat Block 7392:134). A headline number with a short label, three or four in a row, and an
// optional Delta. The number is in tabular figures. Only real, sourced numbers: never round up for
// effect. It is a description list item pair, so a row of them reads "colour pairs checked, 228".
// UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface StatBlockProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The number, formatted: "228", "12.4k". */
  value: ReactNode;
  /** What it counts: "colour pairs checked". */
  label: ReactNode;
  /** Under the label: a Delta. */
  delta?: ReactNode;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function StatBlock({
  value,
  label,
  delta,
  render,
  className,
  ...rest
}: StatBlockProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'stat-block',
      ...rest,
      className: cx('nz-stat-block', className),
      children: (
        <>
          <dt className="nz-stat-block-label" data-slot="stat-block-label">
            {label}
          </dt>
          <dd className="nz-stat-block-value" data-slot="stat-block-value">
            {value}
          </dd>
          {delta != null && <dd className="nz-stat-block-delta">{delta}</dd>}
        </>
      ),
    },
  );
}

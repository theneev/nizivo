// NO directive: Ticker is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dq; Figma's Ticker
// 7390:123). An endless strip of short items: two identical sets slide one set's width, linearly, in
// 30 seconds (15 × --nz-duration-pulse), then start again where they began, so the seam never shows.
// It pauses under the pointer and while anything in it has focus, and stands still under Reduced
// motion. The second set is hidden from assistive technology, so each item is read once.
// UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface TickerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The items: short labels, logos. Each is drawn as a pill with a dot unless `bare`. */
  items: readonly ReactNode[];
  /** Draws the items as they are, without the pill. @default false */
  bare?: boolean;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function Ticker({
  items,
  bare = false,
  render,
  className,
  ...rest
}: TickerProps): ReactElement {
  const set = (hidden: boolean): ReactElement => (
    <ul className="nz-ticker-set" aria-hidden={hidden ? true : undefined}>
      {items.map((item, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- a fixed strip, never reordered
        <li key={index} className={bare ? 'nz-ticker-bare' : 'nz-ticker-item'}>
          {!bare && <span className="nz-ticker-dot" aria-hidden="true" />}
          {item}
        </li>
      ))}
    </ul>
  );
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'ticker',
      ...rest,
      className: cx('nz-ticker', className),
      children: (
        <div className="nz-ticker-track">
          {set(false)}
          {set(true)}
        </div>
      ),
    },
  );
}

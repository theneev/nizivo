// NO directive: the legend renders on the server (Figma 03 "Chart Legend Item", 7275:13291). A
// list, not a control: a series toggle (a pressed button, at least 24 px tall) is a later, additive
// change. The mark follows the series, as Figma draws it: a line for the current period, a dashed
// line for the comparison, a dot for a category.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { cx } from '../_shared/cx';
import { renderElement, type RenderProp } from '../_shared/render';

/**
 * The colour role of a series, shared by its marks and its legend swatch as `data-series`
 * (contracts/vocabulary.json). `current` is chart/primary; `previous` the dashed chart/neutral
 * comparison (decorative: the data table carries its values); `cat-1`…`cat-3` the categorical
 * colours, which never cycle; `other` the folded remainder (chart/neutral).
 */
export type ChartSeries = 'current' | 'previous' | 'cat-1' | 'cat-2' | 'cat-3' | 'other';

export interface LegendItem {
  /** Stable key; the label when absent. */
  id?: string;
  label: string;
  series: ChartSeries;
  /** A pre-formatted value (the donut legend's Numeric/M column). */
  value?: string;
  /** A pre-formatted share, for example "52%" (Mono/M, tertiary). */
  share?: string;
}

export interface LegendState {
  orientation: 'horizontal' | 'vertical';
}

export interface LegendProps extends Omit<ComponentPropsWithRef<'ul'>, 'children'> {
  items: readonly LegendItem[];
  /** `horizontal` wraps in a row (line charts); `vertical` is the donut's table-like list. @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  render?: RenderProp<LegendState>;
}

export function Legend({
  items,
  orientation = 'horizontal',
  render,
  className,
  ...rest
}: LegendProps): ReactElement {
  return renderElement(
    'ul',
    render,
    { orientation },
    {
      'data-slot': 'legend',
      ...rest,
      className: cx('nz-legend', className),
      'data-orientation': orientation,
      children: items.map((item) => (
        <li key={item.id ?? item.label} className="nz-legend-item" data-slot="legend-item">
          <span className="nz-legend-mark" data-series={item.series} aria-hidden="true" />
          <span className="nz-legend-label">{item.label}</span>
          {item.value !== undefined && <span className="nz-legend-value">{item.value}</span>}
          {item.share !== undefined && <span className="nz-legend-share">{item.share}</span>}
        </li>
      )),
    },
  );
}

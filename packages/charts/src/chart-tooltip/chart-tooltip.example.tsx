import type { JSX } from 'react';
import { ChartTooltip } from './index';

/** Figma 03 Series=1: one row. */
export function ChartTooltipExample(): JSX.Element {
  return (
    <ChartTooltip
      title="Tue, Oct 14"
      rows={[{ label: 'This period', value: '$6,284', series: 'current' }]}
    />
  );
}

/** Figma 03 Series=2: the comparison row and the change, up in text/success with its sign. */
export function ChartTooltipCompareExample(): JSX.Element {
  return (
    <ChartTooltip
      title="Tue, Oct 14"
      rows={[
        { label: 'This period', value: '$6,284', series: 'current' },
        { label: 'Previous', value: '$4,910', series: 'previous' },
      ]}
      delta={{ value: '+28.0%', label: 'vs previous', trend: 'up' }}
    />
  );
}

/** A fall reads text/critical, and the minus sign says so without colour. */
export function ChartTooltipDownExample(): JSX.Element {
  return (
    <ChartTooltip
      title="Wed, Oct 15"
      rows={[
        { label: 'This period', value: '$3,980', series: 'current' },
        { label: 'Previous', value: '$4,620', series: 'previous' },
      ]}
      delta={{ value: '−13.9%', label: 'vs previous', trend: 'down' }}
    />
  );
}

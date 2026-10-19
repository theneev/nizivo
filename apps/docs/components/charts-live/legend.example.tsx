// Copied from packages/charts/src/legend/legend.example.tsx, imports made public; do not edit.
// components/chart-example.tsx checks at build time that it still equals the package file.
import type { JSX } from 'react';
import { Legend } from '@nizivo/charts/legend';

export function LegendExample(): JSX.Element {
  return (
    <Legend
      items={[
        { label: 'This period', series: 'current' },
        { label: 'Previous', series: 'previous' },
      ]}
    />
  );
}

/** The donut's table-like legend: dot, name, value (Numeric/M) and share (Mono/M). */
export function LegendVerticalExample(): JSX.Element {
  return (
    <Legend
      orientation="vertical"
      items={[
        { label: 'Online store', series: 'cat-1', value: '$64,120', share: '52%' },
        { label: 'Retail', series: 'cat-2', value: '$33,410', share: '27%' },
        { label: 'Wholesale', series: 'cat-3', value: '$17,260', share: '14%' },
        { label: 'Other', series: 'other', value: '$8,630', share: '7%' },
      ]}
    />
  );
}

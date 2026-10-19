import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Legend } from '../../src/legend/index';

describe('Legend', () => {
  test('a list; each mark carries its series role and is decorative', () => {
    expect(
      renderToStaticMarkup(
        <Legend
          items={[
            { label: 'This period', series: 'current' },
            { label: 'Previous', series: 'previous' },
          ]}
        />,
      ),
    ).toBe(
      '<ul data-slot="legend" class="nz-legend" data-orientation="horizontal">' +
        '<li class="nz-legend-item" data-slot="legend-item"><span class="nz-legend-mark" data-series="current" aria-hidden="true"></span><span class="nz-legend-label">This period</span></li>' +
        '<li class="nz-legend-item" data-slot="legend-item"><span class="nz-legend-mark" data-series="previous" aria-hidden="true"></span><span class="nz-legend-label">Previous</span></li>' +
        '</ul>',
    );
  });

  test('value and share columns, vertical', () => {
    const out = renderToStaticMarkup(
      <Legend
        orientation="vertical"
        items={[{ label: 'Online', series: 'cat-1', value: '$64,120', share: '52%' }]}
      />,
    );
    expect(out).toContain('data-orientation="vertical"');
    expect(out).toContain(
      '<span class="nz-legend-value">$64,120</span><span class="nz-legend-share">52%</span>',
    );
  });
});

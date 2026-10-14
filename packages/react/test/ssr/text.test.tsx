import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Text } from '../../src/text/index';

describe('Text', () => {
  test('a <p> in Body/M with no tone, so the colour is inherited', () => {
    expect(renderToString(<Text>Shown on product pages.</Text>)).toBe(
      '<p data-slot="text" data-variant="body-m" class="nz-text">Shown on product pages.</p>',
    );
  });

  test('variant and tone are presentational attributes; className comes after ours', () => {
    const html = renderToString(
      <Text variant="numeric-kpi" tone="secondary" className="kpi nz-text" id="revenue">
        42
      </Text>,
    );
    expect(html).toBe(
      '<p data-slot="text" data-variant="numeric-kpi" data-tone="secondary" id="revenue" class="nz-text kpi">42</p>',
    );
  });

  test('the 12 px styles are variants, never a size', () => {
    expect(renderToString(<Text variant="label-s">Updated</Text>)).toContain(
      'data-variant="label-s"',
    );
  });

  test('render swaps the element; the part keeps its slot and variant over the element', () => {
    const html = renderToString(
      <Text variant="label-m" render={<span title="SKU" data-variant="body-l" />}>
        SKU
      </Text>,
    );
    expect(html).toMatch(/^<span [^>]*title="SKU"/);
    expect(html).toContain('data-slot="text"');
    expect(html).toContain('data-variant="label-m"');
    expect(html).not.toContain('body-l');
    expect(html).toContain('>SKU</span>');
  });

  test('the function form receives the props and the state', () => {
    const html = renderToString(
      <Text tone="critical" render={(props, state) => <span {...props} title={state.tone} />}>
        Failed
      </Text>,
    );
    expect(html).toMatch(/^<span [^>]*data-tone="critical"[^>]*title="critical"/);
  });
});

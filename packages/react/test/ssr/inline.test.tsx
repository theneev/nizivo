import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Inline } from '../../src/inline/index';

describe('Inline', () => {
  test('a <div> with no gap by default', () => {
    expect(renderToString(<Inline>a</Inline>)).toBe(
      '<div data-slot="inline" class="nz-inline">a</div>',
    );
  });

  test('gap takes a space token key; render swaps the element', () => {
    const html = renderToString(
      <Inline gap="3" render={<nav aria-label="Filters" />}>
        a
      </Inline>,
    );
    expect(html).toMatch(/^<nav [^>]*aria-label="Filters"/);
    expect(html).toContain('data-slot="inline"');
    expect(html).toContain('data-gap="3"');
    expect(html).toContain('class="nz-inline"');
  });
});

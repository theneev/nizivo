import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Separator } from '../../src/separator/index';

describe('Separator', () => {
  test('an <hr>: its implicit role is separator, horizontal by default', () => {
    expect(renderToString(<Separator />)).toBe(
      '<hr data-slot="separator" data-orientation="horizontal" class="nz-separator"/>',
    );
  });

  test('vertical says so to assistive technology', () => {
    expect(renderToString(<Separator orientation="vertical" />)).toBe(
      '<hr data-slot="separator" data-orientation="vertical" class="nz-separator" aria-orientation="vertical"/>',
    );
  });

  test('decorative drops the semantics but keeps the orientation for CSS', () => {
    const html = renderToString(<Separator orientation="vertical" decorative />);
    expect(html).toBe(
      '<hr data-slot="separator" data-orientation="vertical" class="nz-separator" role="none"/>',
    );
  });

  test('another element gets the role an <hr> has implicitly', () => {
    const html = renderToString(<Separator orientation="vertical" render={<div />} />);
    expect(html).toMatch(/^<div [^>]*role="separator"[^>]*aria-orientation="vertical"/);
    expect(renderToString(<Separator decorative render={<div />} />)).toContain('role="none"');
  });
});

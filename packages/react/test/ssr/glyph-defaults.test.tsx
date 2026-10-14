// The internal close and error glyphs (ARCHITECTURE.md §14.2): InlineError's `icon` and AlertDismiss's
// `children` default to them, and a given glyph replaces them.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { AlertDismiss } from '../../src/alert/alert-dismiss.client';
import { InlineError } from '../../src/inline-error/inline-error';

describe('InlineError', () => {
  test('the error mark defaults to circle-x', () => {
    const html = renderToString(<InlineError>Enter a price.</InlineError>);
    expect(html).toContain(
      '<span class="nz-inline-error-icon" data-slot="inline-error-icon" aria-hidden="true"><svg class="nz-glyph nz-glyph-circle-x"',
    );
    expect(html).toContain('<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path>');
  });

  test('a given icon replaces it', () => {
    const html = renderToString(<InlineError icon={<i>!</i>}>Enter a price.</InlineError>);
    expect(html).toContain('aria-hidden="true"><i>!</i></span>');
    expect(html).not.toContain('nz-glyph');
  });
});

describe('AlertDismiss', () => {
  test('the close mark defaults to Lucide x', () => {
    const html = renderToString(<AlertDismiss />);
    expect(html).toContain(
      '<span class="nz-alert-dismiss-icon" data-slot="alert-dismiss-icon" aria-hidden="true"><svg class="nz-glyph nz-glyph-close"',
    );
    expect(html).toContain('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>');
    expect(html).toContain('aria-label="Dismiss"');
  });

  test('children replace it', () => {
    expect(renderToString(<AlertDismiss>×</AlertDismiss>)).not.toContain('nz-glyph');
  });
});

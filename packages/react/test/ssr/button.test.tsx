// Button's pending state (ARCHITECTURE.md §10.2; M34, M37): the spinner, the label, and the "Loading…"
// text that button.css shows in the label's place only under Reduced motion. The markup is the same in both motion modes; the
// browser case in test/browser/button.spec.tsx checks what each mode shows.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Button } from '../../src/button/button';
import { SpinnerGlyph } from '../../src/_internal/glyphs';

const PENDING_LABEL = '<span class="nz-button-pending-label" data-slot="button-pending-label">';

describe('pending', () => {
  test('the spinner replaces the leading icon, and the loading text comes before the label', () => {
    const html = renderToString(
      <Button pending leadingIcon={<svg data-icon="" />}>
        Publish
      </Button>,
    );
    expect(html).toBe(
      '<button data-slot="button" data-variant="secondary" data-size="md" data-pending="" class="nz-button nz-hit-target" type="button" aria-disabled="true">' +
        '<span class="nz-button-icon" data-slot="button-icon" aria-hidden="true">' +
        renderToString(<SpinnerGlyph />) +
        '</span>' +
        `${PENDING_LABEL}Loading…</span>` +
        '<span class="nz-button-label" data-slot="button-label">Publish</span>' +
        '</button>',
    );
  });

  test('labels.pending replaces the text, which leads the accessible name', () => {
    const html = renderToString(
      <Button pending labels={{ pending: 'Wird geladen…' }}>
        Veröffentlichen
      </Button>,
    );
    expect(html).toContain(`${PENDING_LABEL}Wird geladen…</span>`);
    // not aria-hidden: under Reduced motion the name is "Wird geladen… Veröffentlichen", the word on
    // screen first (WCAG 2.5.3); under default motion the text is display: none and the name is the label
    expect(html.indexOf('Wird geladen…')).toBeLessThan(html.indexOf('Veröffentlichen'));
    expect(html).not.toContain('aria-label');
    expect(html).toContain('aria-disabled="true"');
  });

  test('a custom pendingIndicator keeps the loading text', () => {
    const html = renderToString(
      <Button pending pendingIndicator={<svg data-mine="" />}>
        Save
      </Button>,
    );
    expect(html).toContain('<svg data-mine=""></svg>');
    expect(html).not.toContain('nz-glyph-spinner');
    expect(html).toContain(`${PENDING_LABEL}Loading…</span>`);
  });

  test('not pending: no spinner and no loading text, and labels changes nothing', () => {
    const html = renderToString(<Button labels={{ pending: 'Wird geladen…' }}>Save</Button>);
    expect(html).toBe(
      '<button data-slot="button" data-variant="secondary" data-size="md" class="nz-button nz-hit-target" type="button">' +
        '<span class="nz-button-label" data-slot="button-label">Save</span></button>',
    );
  });

  test('labels never reaches the DOM', () => {
    expect(renderToString(<Button pending labels={{}} />)).not.toContain('labels');
  });
});

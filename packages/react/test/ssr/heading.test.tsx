import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Heading } from '../../src/heading/index';

describe('Heading', () => {
  test('level picks the element and, by default, the style of the same name', () => {
    expect(renderToString(<Heading level={1}>Overview</Heading>)).toBe(
      '<h1 data-slot="heading" data-variant="heading-h1" class="nz-heading">Overview</h1>',
    );
    expect(renderToString(<Heading level={3}>No orders yet</Heading>)).toMatch(
      /^<h3 [^>]*data-variant="heading-h3"/,
    );
  });

  test('levels 5 and 6 default to Heading/H4, the smallest Figma heading style', () => {
    expect(renderToString(<Heading level={5}>Notes</Heading>)).toMatch(
      /^<h5 [^>]*data-variant="heading-h4"/,
    );
    expect(renderToString(<Heading level={6}>Notes</Heading>)).toMatch(
      /^<h6 [^>]*data-variant="heading-h4"/,
    );
  });

  test('the look is independent of the level', () => {
    const html = renderToString(
      <Heading level={2} variant="heading-h4" tone="primary">
        Revenue
      </Heading>,
    );
    expect(html).toBe(
      '<h2 data-slot="heading" data-variant="heading-h4" data-tone="primary" class="nz-heading">Revenue</h2>',
    );
  });

  test('level is required', () => {
    // @ts-expect-error a heading without a level has no place in the outline
    const element = <Heading>Untitled</Heading>;
    expect(element).toBeDefined();
  });
});

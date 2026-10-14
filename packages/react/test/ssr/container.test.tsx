import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Container } from '../../src/container/index';

describe('Container', () => {
  test('a <div>, or the landmark a render element names', () => {
    expect(renderToString(<Container>a</Container>)).toBe(
      '<div data-slot="container" class="nz-container">a</div>',
    );
    expect(renderToString(<Container render={<main />}>a</Container>)).toBe(
      '<main data-slot="container" class="nz-container">a</main>',
    );
  });
});

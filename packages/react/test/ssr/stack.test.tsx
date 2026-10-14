import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Stack } from '../../src/stack/index';

describe('Stack', () => {
  test('a <div> with no gap by default', () => {
    expect(renderToString(<Stack>a</Stack>)).toBe(
      '<div data-slot="stack" class="nz-stack">a</div>',
    );
  });

  test('gap takes a space token key', () => {
    expect(renderToString(<Stack gap="1-5">a</Stack>)).toBe(
      '<div data-slot="stack" data-gap="1-5" class="nz-stack">a</div>',
    );
  });

  test('gap rejects raw lengths', () => {
    // @ts-expect-error token keys only (inventory §3.8)
    const element = <Stack gap="13px">a</Stack>;
    expect(element).toBeDefined();
  });

  test('render makes it a list', () => {
    const html = renderToString(
      <Stack gap="2" render={<ul />}>
        <li>Mug</li>
      </Stack>,
    );
    expect(html).toBe('<ul data-slot="stack" data-gap="2" class="nz-stack"><li>Mug</li></ul>');
  });
});

import type { ComponentPropsWithRef, JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Image } from '../../src/image/index';

function FrameworkImage({ alt, ...props }: ComponentPropsWithRef<'img'>): JSX.Element {
  return <img alt={alt} {...props} data-framework="" />;
}

describe('Image', () => {
  test('an <img> that reserves its box, loads lazily and writes no inline style', () => {
    const html = renderToString(
      <Image src="/mug.jpg" alt="Stoneware mug" width={800} height={1000} />,
    );
    expect(html).toBe(
      '<img data-slot="image" class="nz-image" src="/mug.jpg" alt="Stoneware mug" width="800" height="1000" loading="lazy" decoding="async"/>',
    );
    expect(html).not.toContain('style=');
  });

  test('priority loads eagerly with a high fetch priority', () => {
    const html = renderToString(
      <Image src="/hero.jpg" alt="" width={1600} height={900} priority />,
    );
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('alt=""');
  });

  test('ratio is a presentational attribute', () => {
    expect(
      renderToString(<Image src="/a.jpg" alt="A" width={600} height={600} ratio="16/9" />),
    ).toContain('data-ratio="16/9"');
  });

  test('alt, width and height are required', () => {
    // @ts-expect-error alt is required (`alt=""` for a decorative image)
    const noAlt = <Image src="/a.jpg" width={1} height={1} />;
    // @ts-expect-error width and height are required
    const noSize = <Image src="/a.jpg" alt="A" />;
    expect([noAlt, noSize]).toHaveLength(2);
  });

  test('a framework image receives every prop', () => {
    const html = renderToString(
      <Image src="/a.jpg" alt="A" width={600} height={400} render={<FrameworkImage />} />,
    );
    expect(html).toMatch(/^<img [^>]*data-framework=""/);
    expect(html).toContain('class="nz-image"');
    expect(html).toContain('data-slot="image"');
    expect(html).toContain('width="600"');
    expect(html).toContain('loading="lazy"');
  });
});

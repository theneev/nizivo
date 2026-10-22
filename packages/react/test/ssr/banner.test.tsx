import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { BannerExample, BannerWarningExample } from '../../src/banner/banner.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Banner is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/banner/banner.tsx');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Banner is split', () => {
  test('the subpath reaches exactly one client module, the dismiss leaf', () => {
    const { modules } = graph(SRC, 'src/banner/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/banner/banner-dismiss.client.tsx',
    ]);
  });
});

describe('Banner markup', () => {
  test('brand: media before the text, then the action; no live role, no dismiss', () => {
    const html = renderToString(<BannerExample />);
    expect(html).toMatch(/^<div data-slot="banner" data-tone="brand" class="nz-banner">/);
    expect(html).toContain(
      '<span class="nz-banner-media" data-slot="banner-media" aria-hidden="true">',
    );
    expect(html).not.toContain('role=');
    expect(html).not.toContain('banner-dismiss');
    expect(html.indexOf('banner-content')).toBeLessThan(html.indexOf('banner-action'));
  });

  test('warning: the icon, the action, then a 40 px dismiss named "Dismiss"', () => {
    const html = renderToString(<BannerWarningExample />);
    expect(html).toContain('data-tone="warning"');
    expect(html).toContain(
      '<span class="nz-banner-icon" data-slot="banner-icon" aria-hidden="true">',
    );
    expect(html).toMatch(
      /<button data-slot="banner-dismiss" data-variant="tertiary" data-size="md" type="button" aria-label="Dismiss" class="nz-banner-dismiss nz-icon-button nz-hit-target">/,
    );
    expect(html.indexOf('banner-action')).toBeLessThan(html.indexOf('banner-dismiss'));
  });
});

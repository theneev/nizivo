import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { PageHeader } from '../../src/page-header/index';
import { PageHeaderDetailExample } from '../../src/page-header/page-header.example';

describe('PageHeader markup', () => {
  test('a <header> with one <h1>, then the actions', () => {
    const html = renderToString(
      <PageHeader title="Orders" actions={<button type="button">Export</button>} />,
    );
    expect(html).toMatch(/^<header data-slot="page-header" class="nz-page-header">/);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(
      '<h1 class="nz-page-header-title" data-slot="page-header-title">Orders</h1>',
    );
    expect(html.indexOf('page-header-title')).toBeLessThan(html.indexOf('page-header-actions'));
    expect(html).not.toContain('page-header-meta');
    expect(html).not.toContain('page-header-description');
  });

  test('meta after the title, the description under it; level 2 renders an <h2>', () => {
    const html = renderToString(<PageHeaderDetailExample />);
    expect(html.indexOf('page-header-title')).toBeLessThan(html.indexOf('page-header-meta'));
    expect(html).toContain(
      '<p class="nz-page-header-description" data-slot="page-header-description">',
    );
    expect(renderToString(<PageHeader title="Settings" level={2} />)).toContain('<h2 ');
  });
});

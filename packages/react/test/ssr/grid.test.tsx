import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Grid, GridItem } from '../../src/grid/index';

describe('Grid and GridItem', () => {
  test('Grid uses the responsive gutter unless gap names a space token', () => {
    expect(renderToString(<Grid />)).toBe('<div data-slot="grid" class="nz-grid"></div>');
    expect(renderToString(<Grid gap="4" />)).toBe(
      '<div data-slot="grid" data-gap="4" class="nz-grid"></div>',
    );
  });

  test('GridItem spans one column unless told otherwise', () => {
    expect(renderToString(<GridItem />)).toBe(
      '<div data-slot="grid-item" class="nz-grid-item"></div>',
    );
    expect(renderToString(<GridItem span={8} />)).toBe(
      '<div data-slot="grid-item" data-span="8" class="nz-grid-item"></div>',
    );
    expect(renderToString(<GridItem span="full" />)).toContain('data-span="full"');
  });

  test('a responsive span writes one attribute per breakpoint, mobile first', () => {
    expect(renderToString(<GridItem span={{ base: 'full', sm: 4, lg: 3 }} />)).toBe(
      '<div data-slot="grid-item" data-span="full" data-span-sm="4" data-span-lg="3" class="nz-grid-item"></div>',
    );
    expect(renderToString(<GridItem span={{ lg: 8 }} />)).toBe(
      '<div data-slot="grid-item" data-span-lg="8" class="nz-grid-item"></div>',
    );
  });

  test('spans stop at 12', () => {
    // @ts-expect-error the desktop grid has 12 columns
    const element = <GridItem span={13} />;
    expect(element).toBeDefined();
  });
});

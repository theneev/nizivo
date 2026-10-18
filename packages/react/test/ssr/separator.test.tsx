import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Separator } from '../../src/separator/index';
import { SeparatorExample } from '../../src/separator/separator.example';

describe('Separator', () => {
  test('decorative by default (M35, Figma Divider 7370:95): role="none", horizontal', () => {
    expect(renderToString(<Separator />)).toBe(
      '<hr data-slot="separator" data-orientation="horizontal" class="nz-separator" role="none"/>',
    );
  });

  test('decorative keeps the orientation for CSS and writes no aria-orientation', () => {
    expect(renderToString(<Separator orientation="vertical" />)).toBe(
      '<hr data-slot="separator" data-orientation="vertical" class="nz-separator" role="none"/>',
    );
  });

  test("decorative={false}: an <hr>'s implicit separator role, horizontal by default", () => {
    expect(renderToString(<Separator decorative={false} />)).toBe(
      '<hr data-slot="separator" data-orientation="horizontal" class="nz-separator"/>',
    );
  });

  test('decorative={false}, vertical: says so to assistive technology', () => {
    expect(renderToString(<Separator orientation="vertical" decorative={false} />)).toBe(
      '<hr data-slot="separator" data-orientation="vertical" class="nz-separator" aria-orientation="vertical"/>',
    );
  });

  test('another element gets the role an <hr> has implicitly, or none when decorative', () => {
    const html = renderToString(
      <Separator orientation="vertical" decorative={false} render={<div />} />,
    );
    expect(html).toMatch(/^<div [^>]*role="separator"[^>]*aria-orientation="vertical"/);
    expect(renderToString(<Separator render={<div />} />)).toContain('role="none"');
  });

  test('render receives the resolved state, decorative included', () => {
    const states: unknown[] = [];
    const record = (props: object, state: unknown): JSX.Element => {
      states.push(state);
      return <div {...props} />;
    };
    renderToString(
      <>
        <Separator render={record} />
        <Separator decorative={false} orientation="vertical" render={record} />
      </>,
    );
    expect(states).toEqual([
      { orientation: 'horizontal', decorative: true },
      { orientation: 'vertical', decorative: false },
    ]);
  });

  test('the example: one meaningful rule, one decorative', () => {
    const html = renderToString(<SeparatorExample />);
    expect(html.match(/<hr [^>]*>/g)).toEqual([
      '<hr data-slot="separator" data-orientation="horizontal" class="nz-separator"/>',
      '<hr data-slot="separator" data-orientation="vertical" class="nz-separator" role="none"/>',
    ]);
  });
});

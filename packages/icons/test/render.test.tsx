// What an icon renders (ARCHITECTURE.md §14.2): the settled stroke, decorative by default, named with
// `label`, consumer props last, React 19 `ref` as a prop, RTL mirroring for the listed icons only.
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Instagram } from '../src/brands/instagram';
import { Calendar } from '../src/icons/calendar';
import { ChevronLeft } from '../src/icons/chevron-left';
import { Galaxy } from '../src/icons/galaxy';

function svg(markup: string): string {
  return /^<svg[^>]*>/.exec(markup)?.[0] ?? '';
}

describe('a stroke icon', () => {
  test('defaults: 1em, currentColor, stroke 1.92 on the 24 viewBox, decorative', () => {
    const markup = renderToStaticMarkup(<Calendar />);
    expect(svg(markup)).toBe(
      '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
    );
    expect(markup).toContain('<path d="M3 9h18"></path>');
    expect(markup).not.toContain('role=');
    expect(markup).not.toContain('<title');
    expect(markup).not.toContain('vector-effect');
  });

  test('`label` names it: role="img" with aria-label, no aria-hidden', () => {
    const markup = svg(renderToStaticMarkup(<Calendar label="Due date" />));
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Due date"');
    expect(markup).not.toContain('aria-hidden');
  });

  test('a consumer aria-label or aria-labelledby also unhides it', () => {
    const byLabel = svg(renderToStaticMarkup(<Calendar aria-label="Due" />));
    const byId = svg(renderToStaticMarkup(<Calendar aria-labelledby="due" />));
    for (const markup of [byLabel, byId]) {
      expect(markup).toContain('role="img"');
      expect(markup).not.toContain('aria-hidden');
    }
  });

  test('an empty or blank name names nothing: the icon stays decorative (axe svg-img-alt)', () => {
    for (const markup of [
      svg(renderToStaticMarkup(<Calendar label="" />)),
      svg(renderToStaticMarkup(<Calendar label="  " />)),
      svg(renderToStaticMarkup(<Instagram label="" />)),
    ]) {
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).not.toContain('role=');
      expect(markup).not.toContain('aria-label');
    }
    expect(svg(renderToStaticMarkup(<Calendar aria-label="" />))).toContain('aria-hidden="true"');
  });

  test('a <title> child is not a name: the icon stays hidden (use `label`)', () => {
    const markup = renderToStaticMarkup(
      <Calendar>
        <title>Due date</title>
      </Calendar>,
    );
    expect(svg(markup)).toContain('aria-hidden="true"');
    expect(markup).toContain('<title>Due date</title>');
  });

  test('size, strokeWidth, className and other props pass through; consumer props win', () => {
    const markup = svg(
      renderToStaticMarkup(
        <Calendar size={20} strokeWidth={1.6} className="kpi-icon" data-testid="cal" fill="red" />,
      ),
    );
    expect(markup).toContain('width="20" height="20"');
    expect(markup).toContain('stroke-width="1.6"');
    expect(markup).toContain('class="kpi-icon"');
    expect(markup).toContain('data-testid="cal"');
    expect(markup).toContain('fill="red"');
    expect(markup).not.toContain('fill="none"');
  });

  test('absoluteStrokeWidth keeps the stroke in CSS pixels at any size, em included', () => {
    const markup = renderToStaticMarkup(<Calendar absoluteStrokeWidth strokeWidth={1.6} />);
    const shapes = markup.match(/<(path|rect) /g) ?? [];
    expect(shapes.length).toBeGreaterThan(1);
    expect(markup.match(/vector-effect="non-scaling-stroke"/g)).toHaveLength(shapes.length);
    expect(svg(markup)).toContain('stroke-width="1.6"');
  });

  test('children render after the drawing', () => {
    const markup = renderToStaticMarkup(
      <Calendar>
        <circle cx="20" cy="4" r="3" fill="currentColor" />
      </Calendar>,
    );
    expect(markup).toMatch(/<path d="M3 9h18"><\/path><circle cx="20"/);
  });

  test('a filled dot keeps its fill', () => {
    expect(renderToStaticMarkup(<Galaxy />)).toContain('r="1" fill="currentColor"');
  });
});

describe('ref (React 19: a plain prop, no forwardRef)', () => {
  test('reaches the <svg> element', () => {
    const ref = createRef<SVGSVGElement>();
    const element = Calendar({ ref });
    expect(element.type).toBe('svg');
    expect(element.props).toHaveProperty('ref', ref);
  });
});

describe('RTL mirroring (mirror.json)', () => {
  test('a directional icon carries data-mirror="rtl"', () => {
    expect(svg(renderToStaticMarkup(<ChevronLeft />))).toContain('data-mirror="rtl"');
  });

  test('mirror={false} opts one instance out', () => {
    expect(renderToStaticMarkup(<ChevronLeft mirror={false} />)).not.toContain('data-mirror');
  });

  test('other icons never carry it, whatever the prop says', () => {
    expect(renderToStaticMarkup(<Calendar mirror />)).not.toContain('data-mirror');
  });
});

describe('a brand glyph', () => {
  test('is one filled path, decorative by default', () => {
    const markup = renderToStaticMarkup(<Instagram />);
    expect(svg(markup)).toBe(
      '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">',
    );
    expect(markup.match(/<path /g)).toHaveLength(1);
    expect(markup).not.toContain('stroke');
    expect(markup).not.toContain('<title');
  });

  test('`label` names it', () => {
    const markup = svg(renderToStaticMarkup(<Instagram label="Instagram" size={24} />));
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Instagram"');
    expect(markup).toContain('width="24"');
  });
});

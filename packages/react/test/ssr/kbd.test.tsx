import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Kbd } from '../../src/kbd/index';

describe('Kbd', () => {
  test('children are drawn as written, in one <kbd>', () => {
    expect(renderToString(<Kbd>↑↓</Kbd>)).toBe(
      '<kbd data-slot="kbd" class="nz-kbd">' +
        '<span class="nz-kbd-label" data-slot="kbd-label">↑↓</span></kbd>',
    );
  });

  test('keys draws both platforms; CSS shows one through data-nz-platform', () => {
    const html = renderToString(<Kbd keys="mod+shift+d" />);
    expect(html).toBe(
      '<kbd data-slot="kbd" class="nz-kbd">' +
        '<span class="nz-kbd-label" data-slot="kbd-label">' +
        '<span class="nz-kbd-glyphs" data-slot="kbd-glyphs" data-platform="apple">⌘⇧D</span>' +
        '<span class="nz-kbd-glyphs" data-slot="kbd-glyphs" data-platform="other">Ctrl+Shift+D</span>' +
        '</span></kbd>',
    );
  });

  test('a key spelled the same on every platform needs no platform spans', () => {
    expect(renderToString(<Kbd keys="esc" />)).toBe(
      '<kbd data-slot="kbd" class="nz-kbd">' +
        '<span class="nz-kbd-label" data-slot="kbd-label">esc</span></kbd>',
    );
    expect(renderToString(<Kbd keys="k" />)).toBe(
      '<kbd data-slot="kbd" class="nz-kbd">' +
        '<span class="nz-kbd-label" data-slot="kbd-label">K</span></kbd>',
    );
    expect(renderToString(<Kbd keys="up" />)).toBe(
      '<kbd data-slot="kbd" class="nz-kbd">' +
        '<span class="nz-kbd-label" data-slot="kbd-label">↑</span></kbd>',
    );
  });

  test('modifier names are case-insensitive and unknown keys pass through', () => {
    const html = renderToString(<Kbd keys="Alt + F4" />);
    expect(html).toContain('data-platform="apple">⌥F4</span>');
    expect(html).toContain('data-platform="other">Alt+F4</span>');
  });

  test('the plus key: "plus", or a "+" where a key is due', () => {
    for (const keys of ['mod++', 'mod+plus', 'mod + +']) {
      const html = renderToString(<Kbd keys={keys} />);
      expect(html).toContain('data-platform="apple">⌘+</span>');
      expect(html).toContain('data-platform="other">Ctrl++</span>');
    }
    expect(renderToString(<Kbd keys="+" />)).toBe(
      '<kbd data-slot="kbd" class="nz-kbd">' +
        '<span class="nz-kbd-label" data-slot="kbd-label">+</span></kbd>',
    );
    expect(renderToString(<Kbd keys="shift++" />)).toContain('data-platform="apple">⇧+</span>');
  });

  test('keys replaces children', () => {
    const html = renderToString(<Kbd keys="mod+k">ignored</Kbd>);
    expect(html).not.toContain('ignored');
    expect(html).toContain('>⌘K<');
  });
});

import { expect, test } from 'vitest';
import manifest from '../../package.json' with { type: 'json' };

const [notices = ''] = Object.values(
  import.meta.glob('../../THIRD_PARTY_NOTICES*', { query: '?raw', import: 'default', eager: true }),
);
const [glyphs = ''] = Object.values(
  import.meta.glob('../../src/_internal/glyphs.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);

/** The glyph names in `_internal/glyphs.tsx`, from its `GlyphName` union. */
const GLYPHS = [
  ...(/export type GlyphName =([^;]*);/.exec(glyphs)?.[1] ?? '').matchAll(/'([^']+)'/g),
]
  .map((match) => match[1] ?? '')
  .toSorted((a, b) => a.localeCompare(b));

/** Glyph name → the Lucide icon whose path data it reuses. */
const LUCIDE: Record<string, string> = {
  spinner: 'loader-circle',
  chevron: 'chevron-right',
  'chevrons-up-down': 'chevrons-up-down',
  'circle-x': 'circle-x',
  'circle-check': 'circle-check',
  info: 'info',
  close: 'x',
  check: 'check',
  minus: 'minus',
  plus: 'plus',
  eye: 'eye',
  'eye-off': 'eye-off',
  search: 'search',
  ellipsis: 'ellipsis',
  calendar: 'calendar',
  sparkles: 'sparkles',
  globe: 'globe',
  'file-text': 'file-text',
  'thumbs-up': 'thumbs-up',
  'thumbs-down': 'thumbs-down',
  'wand-sparkles': 'wand-sparkles',
  'circle-alert': 'circle-alert',
  'circle-stop': 'circle-stop',
  'refresh-cw': 'refresh-cw',
  mic: 'mic',
  'arrow-up': 'arrow-up',
  star: 'star',
  heart: 'heart',
  'message-circle': 'message-circle',
  clock: 'clock',
  play: 'play',
  pause: 'pause',
  'skip-back': 'skip-back',
  'skip-forward': 'skip-forward',
};

/**
 * On Lucide's list of Feather-derived icons (lucide-static 1.56.0 LICENSE; `x-circle` is `circle-x`,
 * `more-horizontal` is `ellipsis`, `alert-circle` is `circle-alert`).
 */
const FEATHER = new Set([
  'chevron-right',
  'circle-x',
  'info',
  'x',
  'check',
  'minus',
  'plus',
  'search',
  'ellipsis',
  'calendar',
  'circle-alert',
  'arrow-up',
  'clock',
]);

// _internal/glyphs.tsx reuses Lucide path data; ISC requires its notice in every copy (§14.2, §19.3).
test('the tarball carries the Lucide ISC notice for the internal glyphs', () => {
  expect(manifest.files).toContain('THIRD_PARTY_NOTICES');
  expect(notices).toContain('Copyright (c) 2026 Lucide Icons and Contributors');
  expect(notices).toContain(
    'provided that the above\ncopyright notice and this permission notice appear in all copies.',
  );
});

test('every inlined glyph is listed by its Lucide name', () => {
  expect(GLYPHS).toEqual(Object.keys(LUCIDE).toSorted((a, b) => a.localeCompare(b)));
  for (const icon of Object.values(LUCIDE)) expect(notices).toMatch(new RegExp(`^  ${icon} `, 'm'));
});

// Feather-derived glyphs are also under Feather's MIT licence, whose notice must ship too (§14.2).
test('a Feather-derived glyph brings the Feather MIT notice', () => {
  const derived = Object.values(LUCIDE).filter((icon) => FEATHER.has(icon));
  expect(derived.length).toBeGreaterThan(0);
  expect(notices).toContain('Copyright (c) 2013-present Cole Bemis');
  expect(notices).toContain(
    'The above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.',
  );
  for (const icon of derived) expect(notices).toContain(icon);
});

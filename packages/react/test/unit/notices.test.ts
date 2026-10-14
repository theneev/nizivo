import { expect, test } from 'vitest';
import manifest from '../../package.json' with { type: 'json' };

const [notices = ''] = Object.values(
  import.meta.glob('../../THIRD_PARTY_NOTICES*', { query: '?raw', import: 'default', eager: true }),
);

// _internal/glyphs.tsx reuses Lucide path data; ISC requires its notice in every copy (§14.2, §19.3).
test('the tarball carries the Lucide ISC notice for the internal glyphs', () => {
  expect(manifest.files).toContain('THIRD_PARTY_NOTICES');
  expect(notices).toContain('Copyright (c) 2026 Lucide Icons and Contributors');
  expect(notices).toContain(
    'provided that the above\ncopyright notice and this permission notice appear in all copies.',
  );
  expect(notices).toContain('loader-circle');
  expect(notices).toContain('chevrons-up-down');
});

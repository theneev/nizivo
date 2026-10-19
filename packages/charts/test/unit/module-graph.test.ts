// Server-first (ARCHITECTURE.md §14.1): every module renders on the server except the one
// ChartInteraction island. Only `*.client.tsx` modules carry 'use client', every one of them does,
// and the barrels a Server Component imports carry no directive.
import { describe, expect, test } from 'vitest';
import { isClient, sources } from '../helpers/source';

const SRC = sources();
const modules = [...SRC.keys()].filter((file) => !file.endsWith('.example.tsx'));

describe("'use client' placement", () => {
  test('only *.client.tsx modules carry the directive, and every one of them does', () => {
    const misplaced = modules.filter(
      (file) => isClient(SRC.get(file) ?? '') !== file.endsWith('.client.tsx'),
    );
    expect(misplaced).toEqual([]);
  });

  test("no module carries 'use server'", () => {
    expect(modules.filter((file) => /^\s*['"]use server['"]/m.test(SRC.get(file) ?? ''))).toEqual(
      [],
    );
  });

  test('every public entry (src/index.ts, src/<part>/index.ts) is directive-free', () => {
    const entries = modules.filter((file) => /^src\/(?:[^/_][^/]*\/)?index\.ts$/.test(file));
    expect(entries).toContain('src/index.ts');
    expect(entries).toContain('src/chart-frame/index.ts');
    expect(entries.filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
  });
});

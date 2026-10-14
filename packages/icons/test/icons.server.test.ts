// Server-safety (ARCHITECTURE.md §14.2, §18.1): no module has a directive or reaches a hook or a
// browser API, and every icon renders with React's react-server build, as in a Server Component.
// Runs in the `react-server` project (vitest.config.ts): Node resolves the react-server condition.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { PACKAGE_DIR } from '../scripts/generate.ts';

const modules = readdirSync(join(PACKAGE_DIR, 'src'), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
  .map((entry) => join(entry.parentPath, entry.name));

test('no module carries a directive', () => {
  expect(modules.length).toBeGreaterThan(1800);
  const directive = /^\s*['"]use (client|server)['"]/m;
  expect(modules.filter((file) => directive.test(readFileSync(file, 'utf8')))).toEqual([]);
});

test('modules import only React types and each other', () => {
  const statements =
    /^(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]/gm;
  const problems: string[] = [];
  for (const file of modules) {
    const text = readFileSync(file, 'utf8');
    for (const [statement, from = '', bare] of text.matchAll(statements)) {
      if (bare !== undefined) problems.push(`${file}: side-effect import ${bare}`);
      else if (
        !from.startsWith('.') &&
        !(from === 'react' && statement.startsWith('import type '))
      ) {
        problems.push(`${file}: ${statement}`);
      }
    }
    if (/\buse[A-Z]\w*\(|\b(window|document|navigator)\./.test(text)) {
      problems.push(`${file}: a hook or a browser global`);
    }
  }
  expect(problems).toEqual([]);
});

// Every icon module is the same generated template over the shared renderIcon (the static checks
// above cover all of them), so a stroke icon, a mirrored one, one with a filled dot and the brand
// glyph cover every code path without transforming ~1,900 modules again.
test('icons render under the react-server build', async () => {
  // The react-server build of React has no client hooks: proof that the condition is in effect.
  const react = await import('react');
  expect(react).not.toHaveProperty('useState');
  const { Calendar } = await import('../src/icons/calendar');
  const { ChevronLeft } = await import('../src/icons/chevron-left');
  const { Galaxy } = await import('../src/icons/galaxy');
  const { Instagram } = await import('../src/brands/instagram');
  const rendered = [Calendar, ChevronLeft, Galaxy].flatMap((Icon) => [
    Icon({}),
    Icon({ label: 'Name', absoluteStrokeWidth: true, mirror: false }),
  ]);
  rendered.push(Instagram({}), Instagram({ label: 'Instagram' }));
  expect(rendered.filter((element) => element.type !== 'svg')).toEqual([]);
  expect(ChevronLeft({}).props).toHaveProperty('data-mirror', 'rtl');
});

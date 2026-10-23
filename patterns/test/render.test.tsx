// Every exported example of every pattern renders on the server from the built packages, as the docs
// render it, and each pattern keeps the shape the docs pipeline reads: one `<name>.example.tsx` per
// folder, an optional `<name>.css` beside it, and imports only from the published packages and React
// (apps/docs/scripts/examples.ts enforces the same list when it copies them).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const src = join(import.meta.dirname, '..', 'src');
const names = readdirSync(src, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .toSorted();

const ALLOWED =
  /^(react|react-dom|@nizivo\/react\/[a-z0-9-]+|@nizivo\/charts(\/[a-z0-9-]+)?|@nizivo\/icons(\/brands\/[a-z0-9-]+)?)$/;

describe('patterns', () => {
  it('has at least one pattern', () => {
    expect(names.length).toBeGreaterThan(0);
  });

  describe.each(names)('%s', (name) => {
    const file = join(src, name, `${name}.example.tsx`);

    it('has only its example and its stylesheet', () => {
      const files = readdirSync(join(src, name)).toSorted();
      const expected = [`${name}.example.tsx`];
      if (existsSync(join(src, name, `${name}.css`))) expected.unshift(`${name}.css`);
      expect(files).toEqual(expected.toSorted());
    });

    it('imports only the published packages and React', () => {
      const specifiers = [...readFileSync(file, 'utf8').matchAll(/from '([^']+)';/g)].map(
        (m) => m[1],
      );
      expect(specifiers.filter((s) => s === undefined || !ALLOWED.test(s))).toEqual([]);
    });

    it('renders every exported example', async () => {
      const mod: unknown = await import(file);
      if (typeof mod !== 'object' || mod === null) throw new Error(`${file} is not a module`);
      const examples = Object.entries(mod).filter(
        (e): e is [string, ComponentType] => e[0].endsWith('Example') && typeof e[1] === 'function',
      );
      expect(examples.length).toBeGreaterThan(0);
      for (const [, Example] of examples) {
        expect(renderToString(createElement(Example))).not.toBe('');
      }
    });
  });
});

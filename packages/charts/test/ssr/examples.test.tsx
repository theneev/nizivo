// Every example renders on the server, without inline style (CSP Profile B, §14.1), and is what the
// visual lane and the docs pick up (src/<part>/<part>.example.tsx, `<Part>…Example` exports).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { SRC_DIR } from '../helpers/source';

function isComponent(value: unknown): value is ComponentType {
  return typeof value === 'function';
}

const parts = readdirSync(SRC_DIR).filter((name) => !name.startsWith('_') && !name.includes('.'));

describe.each(
  parts.filter((part) => readdirSync(join(SRC_DIR, part)).includes(`${part}.example.tsx`)),
)('%s examples', (part) => {
  test('every export is a <Part>…Example component that renders without inline style', async () => {
    const module: Record<string, unknown> = await import(
      join(SRC_DIR, part, `${part}.example.tsx`)
    );
    const pascal = part.replace(/(^|-)([a-z0-9])/g, (_m, _d: string, c: string) => c.toUpperCase());
    const names = Object.keys(module);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(new RegExp(`^${pascal}[A-Za-z0-9]*Example$`));
      const component = module[name];
      if (!isComponent(component)) throw new Error(`${name} is not a component`);
      const out = renderToStaticMarkup(createElement(component));
      expect(out.length).toBeGreaterThan(0);
      expect(out).not.toContain('style=');
    }
  });
});

test('every part has an example', () => {
  expect(
    parts.filter((part) => !readdirSync(join(SRC_DIR, part)).includes(`${part}.example.tsx`)),
  ).toEqual([]);
});

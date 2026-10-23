// The static react-import scan the T0 server-safety tests use (test/helpers/graph.ts).
import { describe, expect, test } from 'vitest';
import { graph, reactImports } from '../helpers/graph';

describe('reactImports', () => {
  test('reads named, default and namespace imports, and skips type-only ones', () => {
    const files = new Map([
      [
        'a.tsx',
        "import { useId, type ReactNode } from 'react';\nimport type { JSX } from 'react';",
      ],
      ['b.tsx', 'import * as React from "react";'],
      ['c.tsx', "import React, {\n  useState as useLocal,\n} from 'react';"],
    ]);
    expect(reactImports(files, files.keys())).toEqual([
      'useId',
      '* as React',
      'default as React',
      'useState',
    ]);
  });
});

describe('graph', () => {
  const files = new Map([
    ['src/a.tsx', "import type { B } from './b';\nimport { c } from './c';"],
    ['src/a.d.ts', "import type { B } from './b.js';"],
    ['src/b.ts', 'export type B = 1;'],
    ['src/b.d.ts', 'export type B = 1;'],
    ['src/c.ts', "export type { B } from './b';\nexport const c = 1;"],
  ]);
  const reach = (entry: string, types?: boolean): string[] =>
    [...graph(files, entry, types === undefined ? {} : { types }).modules].toSorted();

  test("follows a source module's value imports only, unless types are asked for", () => {
    expect(reach('src/a.tsx')).toEqual(['src/a.tsx', 'src/c.ts']);
    expect(reach('src/a.tsx', true)).toEqual(['src/a.tsx', 'src/b.ts', 'src/c.ts']);
  });

  test('a declaration file keeps its type edges', () => {
    expect(reach('src/a.d.ts')).toEqual(['src/a.d.ts', 'src/b.d.ts']);
  });
});

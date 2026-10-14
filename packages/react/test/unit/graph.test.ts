// The static react-import scan the T0 server-safety tests use (test/helpers/graph.ts).
import { describe, expect, test } from 'vitest';
import { reactImports } from '../helpers/graph';

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

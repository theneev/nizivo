import { describe, expect, test } from 'vitest';
import { exportFrom, printJson } from '../gen/format.ts';

// The 100-column rule matches oxfmt (checked against oxfmt 0.73.0 from 97 to 103 columns).
/** A module path that makes `export { A, B } from '<path>';` exactly `width` columns wide. */
function from(width: number): string {
  return `./${'m'.repeat(width - "export { A, B } from './';".length)}`;
}

describe('exportFrom', () => {
  test('keeps a 100-column statement on one line', () => {
    const line = exportFrom(['A', 'B'], from(100));
    expect(line).toHaveLength(100);
    expect(line).not.toContain('\n');
  });

  test('breaks a 101-column statement one specifier per line, with trailing commas', () => {
    expect(exportFrom(['A', 'B'], from(101), true)).toBe(
      `export type {\n  A,\n  B,\n} from '${from(101)}';`,
    );
  });
});

describe('printJson', () => {
  test('expands objects and keeps short arrays inline', () => {
    expect(printJson({ a: { b: ['x', 'y'] }, c: [], d: {} })).toBe(
      '{\n  "a": {\n    "b": ["x", "y"]\n  },\n  "c": [],\n  "d": {}\n}\n',
    );
  });

  test('counts the trailing comma when deciding whether an array fits', () => {
    const value = 'x'.repeat(100 - '  "k": [""]'.length);
    expect(printJson({ k: [value] })).toContain(`"k": ["${value}"]`);
    expect(printJson({ k: [value], z: 1 })).toContain(`"k": [\n    "${value}"\n  ],`);
  });
});

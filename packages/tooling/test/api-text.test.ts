import { describe, expect, test } from 'vitest';
import { normalizeText, parseDocComment, sortKeys } from '../api/text.ts';

describe('parseDocComment', () => {
  test('finds an inline @default that TypeScript reads as plain text, and keeps it out of the text', () => {
    expect(parseDocComment("/** 32 / 40 / 48 px. @default 'md' */")).toEqual({
      default: "'md'",
      description: '32 / 40 / 48 px.',
      params: new Map(),
    });
  });

  test('reads a @default on its own line and joins wrapped lines with one space', () => {
    const doc = parseDocComment(
      '/**\n   * Figma "Variant". One primary per view;\n   * secondary for everything else.\n   * @default \'secondary\'\n   */',
    );
    expect(doc.description).toBe(
      'Figma "Variant". One primary per view; secondary for everything else.',
    );
    expect(doc.default).toBe("'secondary'");
  });

  test('rewrapping a comment changes nothing', () => {
    const narrow = parseDocComment('/**\n * One two\n * three four.\n */');
    const wide = parseDocComment('/** One two three four. */');
    expect(narrow.description).toBe(wide.description);
  });

  test('keeps paragraphs, list items and fenced code', () => {
    const doc = parseDocComment(
      [
        '/**',
        ' * Merges props:',
        ' * - `className` is',
        ' *   concatenated;',
        ' * - `style` is merged.',
        ' *',
        ' * ```tsx',
        ' * <Button',
        ' *   size="sm" />',
        ' * ```',
        ' */',
      ].join('\n'),
    );
    expect(doc.description).toBe(
      'Merges props:\n- `className` is concatenated;\n- `style` is merged.\n\n```tsx\n<Button\n  size="sm" />\n```',
    );
  });

  test('a @deprecated without text is true; an @ that starts no known tag stays text', () => {
    expect(parseDocComment('/** @deprecated */').deprecated).toBe(true);
    expect(parseDocComment('/** Use @nizivo/tokens. @deprecated Use `title`. */')).toEqual({
      deprecated: 'Use `title`.',
      description: 'Use @nizivo/tokens.',
      params: new Map(),
    });
  });

  test('reads @param (with or without a type and a hyphen) and @returns', () => {
    const doc = parseDocComment(
      '/**\n * Joins.\n * @param tone The tone.\n * @param {string[]} extra - More words.\n * @returns The label.\n */',
    );
    expect(doc.description).toBe('Joins.');
    expect([...doc.params]).toEqual([
      ['tone', 'The tone.'],
      ['extra', 'More words.'],
    ]);
    expect(doc.returns).toBe('The label.');
  });
});

test('normalizeText trims and collapses paragraph breaks', () => {
  expect(normalizeText('\n  a\n  b\n\n\n  c  \n')).toBe('a b\n\nc');
});

test('sortKeys sorts in code-point order at every depth, keeps array order and drops undefined', () => {
  expect(JSON.stringify(sortKeys({ b: 1, a: [{ z: 1, Z: 2 }], $comment: 'x', c: undefined }))).toBe(
    '{"$comment":"x","a":[{"Z":2,"z":1}],"b":1}',
  );
});

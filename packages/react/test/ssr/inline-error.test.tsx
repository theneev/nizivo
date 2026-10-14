import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { InlineError } from '../../src/inline-error/inline-error';
import { InlineErrorExample } from '../../src/inline-error/inline-error.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('InlineError is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/inline-error/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('InlineError markup', () => {
  test('icon + text, never colour alone; the mark is decorative', () => {
    expect(renderToString(<InlineError icon={<svg />}>Enter a price.</InlineError>)).toBe(
      '<div data-slot="inline-error" class="nz-inline-error">' +
        '<span class="nz-inline-error-icon" data-slot="inline-error-icon" aria-hidden="true"><svg></svg></span>' +
        '<span class="nz-inline-error-message" data-slot="inline-error-message">Enter a price.</span></div>',
    );
  });

  test('no live region and no lifecycle or validation state of its own', () => {
    const html = renderToString(<InlineErrorExample />);
    expect(html).not.toMatch(/role=|aria-live|data-error|data-invalid/);
  });

  test('the action slot follows the message; ids reach the root for aria-describedby', () => {
    const html = renderToString(
      <InlineError id="price-error" icon={<svg />} action={<button type="button">Retry</button>}>
        Couldn’t load.
      </InlineError>,
    );
    expect(html).toMatch(
      /^<div data-slot="inline-error" id="price-error" class="nz-inline-error">/,
    );
    expect(html).toContain(
      '<span class="nz-inline-error-action" data-slot="inline-error-action"><button type="button">Retry</button></span></div>',
    );
  });
});

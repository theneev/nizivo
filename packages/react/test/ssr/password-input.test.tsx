// PasswordInput (ARCHITECTURE.md §16.1 D20, gap report A §4): server-safety across the RSC boundary
// and the server HTML: a password input in Input's box, the toggle's constant name, aria-pressed and
// aria-controls, the glyph slots, and Field wiring. The toggle and the revert on submit run in a
// browser: test/browser/password-input.spec.tsx.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  unserialisable,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Field } from '../../src/field/field';
import { PasswordInput } from '../../src/password-input/password-input.client';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  {
    path: new URL('../../src/field/field-scope.client.tsx', import.meta.url).pathname,
    exports: ['FieldScope', 'useFieldControl'],
  },
  {
    path: new URL('../../src/password-input/password-input.client.tsx', import.meta.url).pathname,
    exports: ['PasswordInput'],
  },
];

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('module graph', () => {
  test('the subpath reaches three client modules, PasswordInput, FieldScope and the config; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/password-input/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/config/config.client.tsx',
      'src/field/field-scope.client.tsx',
      'src/password-input/password-input.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads, and every example crosses the boundary with serialisable props', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () =>
        Promise.all([
          import('../../src/password-input/index'),
          import('../../src/password-input/password-input.example'),
        ]),
      CLIENT,
    );
    expect(Object.keys(entry)).toEqual(['PasswordInput']);
    expect(Object.keys(examples).toSorted()).toEqual([
      'PasswordInputExample',
      'PasswordInputNewExample',
      'PasswordInputStatesExample',
    ]);
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries.map((b) => b.client)).toContain('PasswordInput');
      for (const boundary of boundaries) expect(unserialisable(boundary.props)).toEqual([]);
    }
  });
});

/** The toggle's opening tag. */
function toggle(html: string): string {
  return /<button[^>]*data-slot="password-input-toggle"[^>]*>/.exec(html)?.[0] ?? '';
}

describe('markup', () => {
  test('standalone: Input’s box, a password input with sign-in defaults, then the toggle', () => {
    const html = renderToString(<PasswordInput aria-label="Password" name="password" />);
    expect(html).toMatch(
      /^<span data-slot="password-input" data-size="md" class="nz-password-input nz-input"><input /,
    );
    const input = /<input [^>]*\/>/.exec(html)?.[0] ?? '';
    const id = /\sid="([^"]+)"/.exec(input)?.[1] ?? '';
    expect(id).not.toBe('');
    expect(input).toContain('autoComplete="current-password"');
    expect(input).toContain('spellCheck="false"');
    expect(input).toContain('autoCapitalize="off"');
    expect(input).toContain('aria-label="Password"');
    expect(input).toContain('name="password"');
    expect(input).toContain(
      'type="password" class="nz-password-input-control nz-input-control" data-slot="password-input-control"',
    );
    expect(toggle(html)).toBe(
      `<button type="button" class="nz-password-input-toggle" data-slot="password-input-toggle" aria-label="Show password" aria-pressed="false" aria-controls="${id}">`,
    );
    // the input comes first, so Tab reaches it before the toggle
    expect(html.indexOf('<input')).toBeLessThan(html.indexOf('<button'));
  });

  test('the toggle’s mark: the eye glyph while hidden, eye-off while shown, aria-hidden', () => {
    const hidden = renderToString(<PasswordInput aria-label="Password" />);
    expect(hidden).toContain(
      '<span class="nz-password-input-icon" data-slot="password-input-icon" aria-hidden="true"><svg class="nz-glyph nz-glyph-eye"',
    );
    const shown = renderToString(<PasswordInput aria-label="Password" defaultVisible />);
    expect(shown).toContain('type="text"');
    expect(shown).toContain('aria-pressed="true"');
    expect(shown).toContain('<svg class="nz-glyph nz-glyph-eye-off"');
    // the name is constant: only aria-pressed changes
    expect(shown).toContain('aria-label="Show password"');
  });

  test('showIcon, hideIcon and labels replace the glyphs and the name', () => {
    const html = renderToString(
      <PasswordInput
        aria-label="Passwort"
        showIcon={<i>show</i>}
        hideIcon={<i>hide</i>}
        labels={{ toggle: 'Passwort anzeigen' }}
      />,
    );
    expect(html).toContain('aria-hidden="true"><i>show</i></span>');
    expect(html).not.toContain('nz-glyph');
    expect(html).toContain('aria-label="Passwort anzeigen"');
    expect(
      renderToString(<PasswordInput aria-label="P" defaultVisible hideIcon={<i>hide</i>} />),
    ).toContain('aria-hidden="true"><i>hide</i></span>');
  });

  test('autoComplete="new-password", and the consumer’s own attributes win', () => {
    const html = renderToString(
      <PasswordInput aria-label="New" autoComplete="new-password" minLength={12} spellCheck />,
    );
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('minLength="12"');
    expect(html).toContain('spellCheck="true"');
  });

  test('size, className and style on the root; render composes it', () => {
    const html = renderToString(
      <PasswordInput aria-label="P" size="sm" className="wide" style={{ inlineSize: '100%' }} />,
    );
    expect(html).toMatch(
      /^<span data-slot="password-input" data-size="sm" class="nz-password-input nz-input wide" style="inline-size:100%">/,
    );
    expect(
      renderToString(<PasswordInput aria-label="P" render={<div data-slot="other" />} />),
    ).toMatch(
      /^<div data-slot="password-input" data-size="md" class="nz-password-input nz-input">/,
    );
  });
});

describe('inside a Field', () => {
  test('the label points at the input; aria-controls is the Field’s id; flags from the Field', () => {
    const html = renderToString(
      <Field ids={IDS} name="password" label="Password" error="Wrong password." required>
        <PasswordInput />
      </Field>,
    );
    expect(html).toContain('<label class="nz-field-label" data-slot="field-label" id="l" for="c">');
    expect(html).toContain('<input id="c" required="" aria-describedby="e" aria-invalid="true"');
    expect(html).toContain('name="password"');
    expect(html).toContain('aria-controls="c"');
    expect(html).toMatch(/<span data-slot="password-input" data-size="md" data-invalid=""/);
  });

  test('a disabled Field disables the input and the toggle', () => {
    const html = renderToString(
      <Field ids={IDS} label="Password" disabled>
        <PasswordInput />
      </Field>,
    );
    expect(html).toMatch(/<span data-slot="password-input" data-size="md" data-disabled=""/);
    expect(html).toMatch(/<input id="c" disabled=""/);
    expect(toggle(html)).toContain(' disabled=""');
  });
});

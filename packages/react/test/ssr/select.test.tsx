// Select's server HTML (ARCHITECTURE.md §10.3, §16.1): every id the trigger's aria-labelledby and
// aria-describedby name is in the page. React Aria's trigger names its own description and error
// slots, which Nizivo never renders (Field owns them), and itself by the id it made, which a Field's
// id replaces; in a browser React Aria drops the slot ids once it mounts, but the server HTML is
// what a page shows before hydration and without JavaScript. The browser side:
// test/overlay/select-field.spec.tsx.
import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Field } from '../../src/field/field';
import { Select } from '../../src/select/index';

function period(props: Partial<Parameters<typeof Select.Root>[0]> = {}, id?: string): JSX.Element {
  return (
    <Select.Root defaultValue="7d" {...props}>
      <Select.Trigger {...(id !== undefined && { id })} />
      <Select.Popup>
        <Select.Item value="7d">Last 7 days</Select.Item>
      </Select.Popup>
    </Select.Root>
  );
}

function trigger(html: string): string {
  return /<button[^>]*data-slot="select-trigger"[^>]*>/.exec(html)?.[0] ?? '';
}

/** The ids the trigger names that no element in the page carries. */
function missingIds(html: string): string[] {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  return ['aria-labelledby', 'aria-describedby'].flatMap((attribute) => {
    const list = new RegExp(`\\s${attribute}="([^"]*)"`).exec(trigger(html))?.[1] ?? '';
    return list
      .split(' ')
      .filter((id) => id !== '' && !ids.has(id))
      .map((id) => `${attribute}: ${id}`);
  });
}

describe('every id the trigger names is in the server HTML', () => {
  const cases: Record<string, () => JSX.Element> = {
    'no Field': () => period({ 'aria-label': 'Period' }),
    'no Field, its own id': () => period({ 'aria-label': 'Period' }, 'own'),
    'a Field with no description': () => <Field label="Period">{period()}</Field>,
    'a Field and an aria-label': () => (
      <Field label="Period" description="Shown on the report">
        {period({ 'aria-label': 'Time range' })}
      </Field>
    ),
  };
  test.each(Object.entries(cases))('%s', (_name, app) => {
    const html = renderToString(app());
    expect(trigger(html)).not.toBe('');
    expect(missingIds(html)).toEqual([]);
  });

  test('with no Field there is no describedby at all; in a Field, its description and error', () => {
    expect(trigger(renderToString(period({ 'aria-label': 'Period' })))).not.toContain(
      'aria-describedby',
    );
    const html = renderToString(
      <Field
        ids={{ control: 'c', label: 'l', description: 'd', error: 'e' }}
        label="Period"
        description="x"
        error="y"
      >
        {period()}
      </Field>,
    );
    expect(trigger(html)).toContain('aria-describedby="d e"');
  });
});

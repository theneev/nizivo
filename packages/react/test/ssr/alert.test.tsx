import { isValidElement, type MouseEvent } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { Alert } from '../../src/alert/alert';
import { AlertDismiss } from '../../src/alert/alert-dismiss.client';
import { AlertDismissibleExample, AlertExample } from '../../src/alert/alert.example';
import { CloseGlyph } from '../../src/_internal/glyphs';
import { IconButton } from '../../src/icon-button/icon-button';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Alert is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/alert/alert.tsx');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('Alert is split', () => {
  test('the subpath reaches exactly one client module, the dismiss leaf', () => {
    const { modules } = graph(SRC, 'src/alert/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/alert/alert-dismiss.client.tsx',
    ]);
  });
});

describe('Alert markup', () => {
  test('a static alert: tone, decorative icon, title and description, no live role', () => {
    expect(renderToString(<AlertExample />)).toBe(
      '<div data-slot="alert" data-tone="info" class="nz-alert">' +
        '<span class="nz-alert-icon" data-slot="alert-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"></circle></svg></span>' +
        '<div class="nz-alert-content" data-slot="alert-content">' +
        '<div class="nz-alert-title" data-slot="alert-title">Payouts move to daily on Nov 1</div>' +
        '<div class="nz-alert-description" data-slot="alert-description">No action needed.</div></div></div>',
    );
  });

  test('only the parts that are given render', () => {
    expect(renderToString(<Alert tone="success">Saved.</Alert>)).toBe(
      '<div data-slot="alert" data-tone="success" class="nz-alert">' +
        '<div class="nz-alert-content" data-slot="alert-content">' +
        '<div class="nz-alert-description" data-slot="alert-description">Saved.</div></div></div>',
    );
  });

  test('an injected alert opts into a live role; the action and the dismiss leaf render', () => {
    const html = renderToString(<AlertDismissibleExample />);
    expect(html).toMatch(
      /^<div data-slot="alert" data-tone="critical" role="alert" class="nz-alert">/,
    );
    expect(html).toContain(
      '<div class="nz-alert-action" data-slot="alert-action"><button data-slot="button"',
    );
    expect(html).toContain(
      '<button data-slot="alert-dismiss" data-variant="tertiary" data-size="sm" type="button" aria-label="Dismiss" class="nz-alert-dismiss nz-icon-button nz-hit-target">' +
        '<span class="nz-icon-button-icon" data-slot="icon-button-icon" aria-hidden="true"><svg',
    );
  });

  test('a false or empty description renders no description element', () => {
    expect(renderToString(<Alert title="Saved">{false}</Alert>)).not.toContain(
      'nz-alert-description',
    );
    expect(renderToString(<Alert title="Saved">{''}</Alert>)).not.toContain('nz-alert-description');
  });

  test('render keeps the part data-slot and tone', () => {
    expect(
      renderToString(
        <Alert tone="warning" render={<section data-tone="info" />}>
          Low stock
        </Alert>,
      ),
    ).toMatch(/^<section data-tone="warning" data-slot="alert" class="nz-alert">/);
  });
});

/** Calls the leaf's click handler as React would, with a minimal event. */
function click(element: unknown, defaultPrevented = false): void {
  if (!isValidElement<{ onClick: (event: Partial<MouseEvent>) => void }>(element)) {
    throw new Error('not an element');
  }
  element.props.onClick({ defaultPrevented });
}

describe('AlertDismiss', () => {
  test('labels name the button; an explicit aria-label wins', () => {
    expect(
      renderToString(<AlertDismiss labels={{ dismiss: 'Schließen' }}>×</AlertDismiss>),
    ).toContain('aria-label="Schließen"');
    expect(
      renderToString(
        <AlertDismiss aria-label="Hide payout notice" labels={{ dismiss: 'Schließen' }}>
          ×
        </AlertDismiss>,
      ),
    ).toContain('aria-label="Hide payout notice"');
  });

  test('onDismiss gets no arguments, so a Server Action can be passed', () => {
    const onDismiss = vi.fn<() => void>();
    click(AlertDismiss({ onDismiss, children: '×' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith();
  });

  test("the consumer's onClick runs first; a prevented click does not dismiss", () => {
    const calls: string[] = [];
    const onDismiss = vi.fn<() => void>(() => {
      calls.push('dismiss');
    });
    const element = AlertDismiss({ onDismiss, onClick: () => calls.push('click'), children: '×' });
    click(element, true);
    expect(onDismiss).not.toHaveBeenCalled();
    click(element);
    expect(calls).toEqual(['click', 'click', 'dismiss']);
  });

  test('render: the consumer element keeps its own props (type, name); type is only set on a real <button>', () => {
    const html = renderToString(
      <AlertDismiss render={<button type="submit" className="icon-button" aria-label="Close" />}>
        ×
      </AlertDismiss>,
    );
    expect(html).toMatch(
      /^<button type="submit" class="nz-alert-dismiss nz-hit-target icon-button" aria-label="Close" data-slot="alert-dismiss">/,
    );
  });
});

/** The opening tag's attributes, as a sorted name=value list. */
function attributes(html: string): string[] {
  const tag = /^<button([^>]*)>/.exec(html)?.[1] ?? '';
  return [...tag.matchAll(/ ([\w-]+)="([^"]*)"/g)]
    .map(([, name, value]) => `${name}=${value}`)
    .toSorted();
}

/** Everything inside the outer element. */
function inner(html: string): string {
  return html.slice(html.indexOf('>') + 1, html.lastIndexOf('</'));
}

describe('AlertDismiss is an IconButton (M28)', () => {
  // What `<IconButton>` writes for the same button: the server path, as the default has no tooltip.
  const iconButton = renderToString(
    <IconButton
      label="Dismiss"
      icon={<CloseGlyph />}
      variant="tertiary"
      size="sm"
      tooltip={false}
    />,
  );

  test("the default is the IconButton element's markup, with the part's slot and class", () => {
    const html = renderToString(<AlertDismiss />);
    const expected = attributes(iconButton)
      .filter((attribute) => attribute !== 'data-slot=icon-button')
      .map((attribute) =>
        attribute.startsWith('class=') ? `class=nz-alert-dismiss ${attribute.slice(6)}` : attribute,
      )
      .concat('data-slot=alert-dismiss')
      .toSorted();
    expect(attributes(html)).toEqual(expected);
    expect(inner(html)).toBe(inner(iconButton));
  });

  test('no tooltip: no trigger wiring, no aria-describedby, no popup', () => {
    const html = renderToString(
      <Alert title="Payout sent" dismiss={<AlertDismiss />}>
        It arrives in two days.
      </Alert>,
    );
    expect(html).not.toMatch(/tooltip|aria-describedby/);
  });

  test('a disabled dismiss is a disabled native button, as an IconButton is', () => {
    expect(attributes(renderToString(<AlertDismiss disabled />))).toContain('disabled=');
  });

  test('render: a composed IconButton keeps its own variant and size, and takes the part slot', () => {
    const html = renderToString(
      <AlertDismiss
        render={
          <IconButton
            label="Hide"
            icon={<CloseGlyph />}
            variant="secondary"
            size="md"
            tooltip={false}
          />
        }
      />,
    );
    expect(html).toMatch(
      /^<button data-slot="alert-dismiss" data-variant="secondary" data-size="md"/,
    );
    expect(html).toContain('class="nz-icon-button nz-hit-target nz-alert-dismiss"');
    // The composed element's own name wins, as for any `render` element.
    expect(html).toContain('aria-label="Hide"');
  });

  test('render: a plain element gets no IconButton look', () => {
    const html = renderToString(
      <AlertDismiss render={<button className="mine" aria-label="Hide" />} />,
    );
    expect(html).not.toMatch(/data-variant|data-size|nz-icon-button"|nz-icon-button /);
    expect(html).toMatch(
      /^<button class="nz-alert-dismiss nz-hit-target mine" aria-label="Hide" data-slot="alert-dismiss">/,
    );
  });
});

// Form, SubmitButton and FormMessage (ARCHITECTURE.md §16.1, gap report A §2.4, §2.5): the module
// graph, the RSC boundary, and the server HTML: Form errors through each Field's one error channel,
// the error summary, FormMessage's live container and SubmitButton's defaults. Focus, edits and
// pending run in a browser: test/browser/form.spec.tsx.
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
import { Form } from '../../src/form/form.client';
import { FormMessage } from '../../src/form/form';
import { SubmitButton } from '../../src/form/submit-button.client';
import { Input } from '../../src/input/input.client';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const CLIENT = [
  { path: '../../src/form/form.client.tsx', exports: ['Form'] },
  { path: '../../src/form/submit-button.client.tsx', exports: ['SubmitButton'] },
  { path: '../../src/field/field-scope.client.tsx', exports: ['FieldScope', 'useFieldControl'] },
  { path: '../../src/input/input.client.tsx', exports: ['Input'] },
].map(({ path, exports }) => ({ path: new URL(path, import.meta.url).pathname, exports }));

const IDS = { control: 'c', label: 'l', description: 'd', error: 'e' };

describe('module graph', () => {
  test('the subpath reaches Form, SubmitButton, FieldScope and the config; react and react-dom outside', () => {
    const { modules, externals } = graph(SRC, 'src/form/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? '')).toSorted()).toEqual([
      'src/config/config.client.tsx',
      'src/field/field-scope.client.tsx',
      'src/form/form.client.tsx',
      'src/form/submit-button.client.tsx',
    ]);
    expect([...externals].toSorted()).toEqual(['react', 'react-dom']);
  });

  test('FormMessage is server-safe: no client module in its graph', () => {
    const { modules } = graph(SRC, 'src/form/form.tsx');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
  });

  test('the Field gains no client module: the Form context lives in FieldScope', () => {
    const { modules } = graph(SRC, 'src/field/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/field/field-scope.client.tsx',
    ]);
    expect([...modules].some((file) => file.startsWith('src/form/'))).toBe(false);
  });
});

describe('react-server build, client leaves as client references', () => {
  test('the entry loads, and every example crosses the boundary with serialisable props', async () => {
    const {
      loaded: [entry, examples],
      react,
    } = await underReactServer(
      () => Promise.all([import('../../src/form/index'), import('../../src/form/form.example')]),
      CLIENT,
    );
    expect(Object.keys(entry).toSorted()).toEqual(['Form', 'FormMessage', 'SubmitButton']);
    expect(Object.keys(examples).toSorted()).toEqual([
      'FormExample',
      'FormMessageExample',
      'FormServerErrorsExample',
    ]);
    const clients = new Set<string>();
    for (const Example of Object.values(examples)) {
      const boundaries: ClientBoundary[] = [];
      withDispatcher(react, () => serverRender(Example(), boundaries));
      for (const boundary of boundaries) {
        clients.add(boundary.client);
        expect(unserialisable(boundary.props, boundary.client)).toEqual([]);
      }
    }
    expect([...clients].toSorted()).toEqual(['FieldScope', 'Form', 'Input', 'SubmitButton']);
  });
});

describe('Form', () => {
  test('a plain <form>: its slot and class, every native attribute through; no summary', () => {
    const html = renderToString(
      <Form action="/save" method="post" className="mine" aria-label="Product">
        <span />
      </Form>,
    );
    expect(html).toBe(
      '<form data-slot="form" class="nz-form mine" aria-label="Product" action="/save" method="post"><span></span></form>',
    );
  });

  test('errors by name reach the Field with that name: message, aria-invalid, describedby', () => {
    const html = renderToString(
      <Form errors={{ title: 'Enter a product title.' }}>
        <Field ids={IDS} name="title" label="Title">
          <Input />
        </Field>
      </Form>,
    );
    expect(html).toMatch(
      /^<form data-slot="form" class="nz-form"><div data-slot="field" data-invalid=""/,
    );
    expect(html).toContain('<input id="c" aria-describedby="e" aria-invalid="true" type="text"');
    expect(html).toContain('name="title"');
    expect(html).toContain('data-slot="inline-error-message">Enter a product title.</span>');
  });

  test('a list of messages shows its first; empty and missing ones present nothing', () => {
    const html = renderToString(
      <Form errors={{ price: ['Enter a price above 0.', 'Enter a number.'], sku: [], title: '' }}>
        <Field ids={IDS} name="price" label="Price">
          <Input />
        </Field>
        <Field name="sku" label="SKU">
          <Input />
        </Field>
        <Field name="title" label="Title">
          <Input />
        </Field>
      </Form>,
    );
    expect(html).toContain('>Enter a price above 0.</span>');
    expect(html).not.toContain('Enter a number.');
    expect(html.match(/data-slot="field-error"/g)).toHaveLength(1);
  });

  test('one error channel: the Field’s own error wins over the Form’s', () => {
    const html = renderToString(
      <Form errors={{ title: 'From the form.' }}>
        <Field name="title" label="Title" error="From the prop.">
          <Input />
        </Field>
      </Form>,
    );
    expect(html).toContain('From the prop.');
    expect(html).not.toContain('From the form.');
    expect(html.match(/data-slot="field-error"/g)).toHaveLength(1);
  });

  test('a Field matches by its own name only, and a Field outside a Form reads nothing', () => {
    const inside = renderToString(
      <Form errors={{ title: 'Enter a title.' }}>
        <Field label="Title">
          <Input name="title" />
        </Field>
        <Field name="other" label="Other">
          <Input />
        </Field>
      </Form>,
    );
    expect(inside).not.toContain('data-slot="field-error"');
    const outside = renderToString(
      <Field name="title" label="Title">
        <Input />
      </Field>,
    );
    expect(outside).not.toContain('aria-invalid');
  });

  test('summary: a critical Alert first, a title and one item per presented error', () => {
    const html = renderToString(
      <Form
        summary
        errors={{ title: 'Enter a product title.', price: ['Enter a price.'], sku: null }}
      >
        <Field name="title" label="Title">
          <Input />
        </Field>
        <Field name="price" label="Price">
          <Input />
        </Field>
      </Form>,
    );
    expect(html).toMatch(
      /^<form data-slot="form" class="nz-form"><div tabindex="-1" class="nz-form-summary" data-slot="form-summary"><div data-slot="alert" data-tone="critical" role="alert" class="nz-alert">/,
    );
    expect(html).toContain('data-slot="alert-title">There is a problem</div>');
    // the links' targets are read from the DOM after hydration: no href in the server HTML
    expect(html).toContain(
      '<li><a class="nz-form-summary-link" data-slot="form-summary-link">Enter a product title.</a></li>' +
        '<li><a class="nz-form-summary-link" data-slot="form-summary-link">Enter a price.</a></li>',
    );
  });

  test('summary: labels, and no summary while nothing is presented', () => {
    expect(
      renderToString(
        <Form summary errors={{ title: 'Enter a title.' }} labels={{ summaryTitle: 'Problem' }} />,
      ),
    ).toContain('data-slot="alert-title">Problem</div>');
    expect(renderToString(<Form summary errors={{ title: [] }} />)).not.toContain('form-summary');
    expect(renderToString(<Form summary />)).not.toContain('form-summary');
  });

  test('render composes the <form>; the part keeps its slot', () => {
    const html = renderToString(<Form render={<section className="mine" data-slot="other" />} />);
    expect(html).toBe('<section class="nz-form mine" data-slot="form"></section>');
  });
});

describe('SubmitButton', () => {
  test('a primary submit Button, not pending outside an action', () => {
    expect(renderToString(<SubmitButton>Save</SubmitButton>)).toBe(
      '<button data-slot="button" data-variant="primary" data-size="md" class="nz-button nz-hit-target" type="submit">' +
        '<span class="nz-button-label" data-slot="button-label">Save</span></button>',
    );
  });

  test('pending: Button’s, focusable with aria-disabled, and type="button" so it cannot resubmit', () => {
    const html = renderToString(
      <SubmitButton pending variant="secondary">
        Save
      </SubmitButton>,
    );
    expect(html).toMatch(/^<button[^>]*data-variant="secondary"[^>]*data-pending=""/);
    expect(html).toContain('type="button" aria-disabled="true"');
    expect(html).not.toContain('disabled=""');
  });
});

describe('FormMessage', () => {
  test('always rendered: an empty live container, critical by default (role="alert")', () => {
    expect(renderToString(<FormMessage />)).toBe(
      '<div data-slot="form-message" data-tone="critical" class="nz-form-message" role="alert"></div>',
    );
    for (const empty of [null, false, '']) {
      expect(renderToString(<FormMessage>{empty}</FormMessage>)).not.toContain('nz-alert');
    }
  });

  test('a message: an Alert of the same tone inside the container, which keeps the live role', () => {
    const html = renderToString(
      <FormMessage title="Not saved" action={<button type="button">Retry</button>}>
        Try again.
      </FormMessage>,
    );
    expect(html).toMatch(
      /^<div data-slot="form-message" data-tone="critical" class="nz-form-message" role="alert"><div data-slot="alert" data-tone="critical" class="nz-alert">/,
    );
    expect(html).toContain('data-slot="alert-title">Not saved</div>');
    expect(html).toContain('data-slot="alert-description">Try again.</div>');
    expect(html).toContain('data-slot="alert-action"><button type="button">Retry</button>');
    // the inner Alert has no live role of its own: one announcement
    expect(html.match(/role="/g)).toHaveLength(1);
  });

  test('success, info and warning are role="status"', () => {
    for (const tone of ['success', 'info', 'warning'] as const) {
      const html = renderToString(<FormMessage tone={tone}>Saved.</FormMessage>);
      expect(html).toContain(`data-tone="${tone}" class="nz-form-message" role="status">`);
      expect(html).toContain(`<div data-slot="alert" data-tone="${tone}" class="nz-alert">`);
    }
  });

  test('className and attributes on the container; render composes it', () => {
    expect(renderToString(<FormMessage className="mine" id="m" tone="success" />)).toBe(
      '<div data-slot="form-message" data-tone="success" id="m" class="nz-form-message mine" role="status"></div>',
    );
    expect(renderToString(<FormMessage render={<section />} />)).toBe(
      '<section data-slot="form-message" data-tone="critical" class="nz-form-message" role="alert"></section>',
    );
  });
});

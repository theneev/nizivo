// Form, SubmitButton and FormMessage in a browser (ARCHITECTURE.md §16.1, gap report A §2.4, §2.5):
// native validation inside a Form, a React action's errors by name with focus on the first invalid
// control, an edit hiding a stale error, the error summary, SubmitButton pending through
// useFormStatus, and FormMessage's live container.
import { useActionState, useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { Form, type FormErrors } from '../../src/form/form.client';
import { FormMessage } from '../../src/form/form';
import { SubmitButton } from '../../src/form/submit-button.client';
import { Input } from '../../src/input/input.client';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/input/input.css',
    '../../src/alert/alert.css',
    '../../src/button/button.css',
    '../../src/form/form.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 8)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  return { container, problems };
}

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

function byLabel(container: HTMLElement, text: string): HTMLInputElement {
  const label = [...container.querySelectorAll('label')].find((l) =>
    l.textContent?.startsWith(text),
  );
  const control = label?.control;
  if (!(control instanceof HTMLInputElement)) throw new Error(`no input labelled ${text}`);
  return control;
}

function one<T extends Element>(
  container: ParentNode,
  selector: string,
  type: abstract new () => T,
): T {
  const element = container.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`no ${selector}`);
  return element;
}

function describedText(control: HTMLElement): string {
  return (control.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? `#${id} missing`)
    .join(' | ');
}

/** A server action's shape: errors by name and a form-level message, echoed values. */
interface Reply {
  errors?: FormErrors;
  formError?: string;
  values?: Record<string, string>;
}

function ProductForm({
  save,
  summary = false,
}: {
  save: (data: FormData) => Promise<Reply>;
  summary?: boolean;
}): JSX.Element {
  const [state, action] = useActionState<Reply, FormData>((_, data) => save(data), {});
  return (
    <Form action={action} errors={state.errors} summary={summary}>
      <FormMessage>{state.formError}</FormMessage>
      <Field name="title" label="Title">
        <Input defaultValue={state.values?.['title']} />
      </Field>
      <Field name="price" label="Price">
        <Input defaultValue={state.values?.['price']} />
      </Field>
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}

const values = (data: FormData): Record<string, string> =>
  Object.fromEntries(
    [...data].map(([key, value]) => [key, typeof value === 'string' ? value : value.name]),
  );

describe('SSR then hydration', () => {
  test('a Form with errors and a summary hydrates with no mismatch, and takes no focus', async () => {
    const app = (
      <Form summary errors={{ price: 'Enter a price.', title: ['Enter a title.'] }}>
        <Field name="title" label="Title">
          <Input />
        </Field>
        <Field name="price" label="Price">
          <Input />
        </Field>
      </Form>
    );
    const { container, problems } = await hydrate(app);
    expect(problems).toEqual([]);
    expect(document.activeElement).toBe(document.body);
    const title = byLabel(container, 'Title');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(describedText(title)).toBe('Enter a title.');
    // after hydration the summary links point at the controls, in page order
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.nz-form-summary-link')];
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Enter a title.', `#${title.id}`],
      ['Enter a price.', `#${byLabel(container, 'Price').id}`],
    ]);
  });
});

describe('native validation inside a Form', () => {
  test('submit with an empty required field: the message inline, focus on it, no action', async () => {
    const action = vi.fn<(data: FormData) => void>();
    const container = await mount(
      <Form action={action}>
        <Field name="sku" label="SKU">
          <Input />
        </Field>
        <Field name="title" label="Title" required messages={{ valueMissing: 'Enter a title.' }}>
          <Input />
        </Field>
        <SubmitButton>Save</SubmitButton>
      </Form>,
    );
    await userEvent.click(one(container, 'button', HTMLButtonElement));
    await settle();
    const title = byLabel(container, 'Title');
    expect(document.activeElement).toBe(title);
    expect(describedText(title)).toBe('Enter a title.');
    expect(container.querySelectorAll('[data-slot="field-error"]')).toHaveLength(1);
    expect(action).not.toHaveBeenCalled();
  });
});

describe('errors from an action', () => {
  test('presented by name; focus moves to the first invalid control; an edit hides a stale one', async () => {
    const save = vi.fn<(data: FormData) => Promise<Reply>>((data: FormData): Promise<Reply> =>
      Promise.resolve({
        errors: { price: 'Enter a price above 0.', title: ['That title is taken.'] },
        values: values(data),
      }),
    );
    const container = await mount(<ProductForm save={save} />);
    const button = one(container, 'button', HTMLButtonElement);
    await userEvent.type(byLabel(container, 'Title'), 'Mug');
    await userEvent.click(button);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(container.querySelectorAll('[data-slot="field-error"]')).toHaveLength(2),
    );
    const title = byLabel(container, 'Title');
    const price = byLabel(container, 'Price');
    // the first invalid control in page order, not the first key of `errors`
    expect(document.activeElement).toBe(title);
    expect(describedText(title)).toBe('That title is taken.');
    expect(describedText(price)).toBe('Enter a price above 0.');
    // the echoed value survived React's reset after the action
    expect(title.value).toBe('Mug');

    // editing the title hides its server error, and only its
    await userEvent.type(title, 's');
    await settle();
    expect(title.hasAttribute('aria-invalid')).toBe(false);
    expect(title.hasAttribute('aria-describedby')).toBe(false);
    expect(container.querySelectorAll('[data-slot="field-error"]')).toHaveLength(1);
    expect(price.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(title);

    // a new reply presents both again and moves focus to the first
    price.focus();
    await userEvent.click(button);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(title.getAttribute('aria-invalid')).toBe('true'));
    expect(document.activeElement).toBe(byLabel(container, 'Title'));
  });

  test('a reply with no errors moves no focus', async () => {
    const save = vi.fn<(data: FormData) => Promise<Reply>>((): Promise<Reply> =>
      Promise.resolve({ errors: {} }),
    );
    const container = await mount(<ProductForm save={save} />);
    const button = one(container, 'button', HTMLButtonElement);
    await userEvent.click(button);
    // where the click left focus: the button, or the body in WebKit on macOS, where a click does not
    // focus a button
    const focused = document.activeElement;
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await settle();
    expect(document.activeElement).toBe(focused);
    expect(container.querySelector('[aria-invalid]')).toBeNull();
  });

  test('a Field’s own error prop wins over the Form’s, in one error slot', async () => {
    const container = await mount(
      <Form errors={{ title: 'From the form.' }}>
        <Field name="title" label="Title" error="From the prop.">
          <Input />
        </Field>
      </Form>,
    );
    expect(describedText(byLabel(container, 'Title'))).toBe('From the prop.');
    expect(container.querySelectorAll('[data-slot="field-error"]')).toHaveLength(1);
  });

  test('summary: new errors focus the summary; a link focuses its control', async () => {
    const save = vi.fn<(data: FormData) => Promise<Reply>>((): Promise<Reply> =>
      Promise.resolve({ errors: { price: 'Enter a price.', title: 'Enter a title.' } }),
    );
    const container = await mount(<ProductForm save={save} summary />);
    expect(container.querySelector('.nz-form-summary')).toBeNull();
    await userEvent.click(one(container, 'button', HTMLButtonElement));
    await vi.waitFor(() => expect(container.querySelector('.nz-form-summary')).not.toBeNull());
    const summary = one(container, '.nz-form-summary', HTMLElement);
    expect(document.activeElement).toBe(summary);
    // the summary comes first in the form, and announces itself as an alert
    expect(summary.parentElement?.firstElementChild).toBe(summary);
    expect(summary.querySelector('[role="alert"]')?.textContent).toContain('There is a problem');
    const links = [...summary.querySelectorAll<HTMLAnchorElement>('a')];
    expect(links.map((link) => link.textContent)).toEqual(['Enter a title.', 'Enter a price.']);
    const at = location.href;
    const last = links.at(-1);
    if (last === undefined) throw new Error('no link');
    await userEvent.click(last);
    expect(document.activeElement).toBe(byLabel(container, 'Price'));
    expect(location.href).toBe(at);
    // an edit removes its line from the summary as well
    await userEvent.type(byLabel(container, 'Price'), '4');
    await settle();
    expect([...summary.querySelectorAll('a')].map((link) => link.textContent)).toEqual([
      'Enter a title.',
    ]);
  });
});

describe('SubmitButton', () => {
  test('pending while the action runs: aria-disabled, data-pending, focus kept, no second submit', async () => {
    const gate: { open?: (reply: Reply) => void } = {};
    const save = vi.fn<(data: FormData) => Promise<Reply>>(
      () =>
        new Promise((resolve) => {
          gate.open = resolve;
        }),
    );
    const container = await mount(<ProductForm save={save} />);
    const button = one(container, 'button', HTMLButtonElement);
    expect(button.type).toBe('submit');
    expect(button.hasAttribute('data-pending')).toBe(false);
    // submitted from the keyboard, which keeps focus on the button in every engine (WebKit on macOS
    // does not focus a button on click)
    button.focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(button.hasAttribute('data-pending')).toBe(true));
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    expect(button.type).toBe('button');
    expect(document.activeElement).toBe(button);
    // a second press (Playwright will not press an aria-disabled button, so a DOM click)
    button.click();
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    gate.open?.({});
    await vi.waitFor(() => expect(button.hasAttribute('data-pending')).toBe(false));
    expect(button.type).toBe('submit');
    expect(button.hasAttribute('aria-disabled')).toBe(false);
  });
});

/** A message that arrives after the first render. */
function LateMessage(): JSX.Element {
  const [text, setText] = useState('');
  return (
    <>
      <FormMessage>{text}</FormMessage>
      <button type="button" onClick={() => setText('We could not save the product.')}>
        Save
      </button>
    </>
  );
}

describe('FormMessage', () => {
  test('the live container is in the page before its message, and keeps its identity', async () => {
    const container = await mount(<LateMessage />);
    const region = one(container, '[data-slot="form-message"]', HTMLElement);
    expect(region.getAttribute('role')).toBe('alert');
    expect(region.childElementCount).toBe(0);
    expect(region.getBoundingClientRect().height).toBe(0);
    await userEvent.click(one(container, 'button', HTMLButtonElement));
    await settle();
    expect(one(container, '[data-slot="form-message"]', HTMLElement)).toBe(region);
    expect(region.querySelector('.nz-alert')?.textContent).toBe('We could not save the product.');
  });
});

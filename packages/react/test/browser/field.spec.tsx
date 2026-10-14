// Field in Chromium (src/field/FIELD-CONTRACT.md): server HTML hydrates with no mismatch, and native
// validation is presented inline through FieldScope. The control is built exactly as the contract
// shows, a stand-in for Input.
import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { mergeProps } from '../../src/contracts/merge-props';
import { stateAttrs } from '../../src/contracts/state';
import { Field } from '../../src/field/field';
import { useFieldControl } from '../../src/field/field-scope.client';
import { Fieldset } from '../../src/fieldset/fieldset';

interface ControlProps extends ComponentPropsWithRef<'input'> {
  invalid?: boolean;
}

function Control({
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-describedby': describedBy,
  ...rest
}: ControlProps): JSX.Element {
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid,
    'aria-describedby': describedBy,
  });
  return (
    <span data-testid="group" {...stateAttrs({ invalid: field.invalid })}>
      <input {...mergeProps(field.controlProps, rest)} />
    </span>
  );
}

// The shipped stylesheets, for the layout checks.
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/fieldset/fieldset.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 4)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  onSubmit.mockClear();
});

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(
  app: ReactNode,
): Promise<{ container: HTMLElement; html: string; problems: unknown[] }> {
  const html = renderToString(app);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(
    hydrateRoot(container, app, {
      onRecoverableError: (error) => problems.push(error),
    }),
  );
  // hydration commits in a task
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { container, html, problems };
}

function byLabel(container: HTMLElement, text: string): HTMLInputElement {
  const label = [...container.querySelectorAll('label')].find((l) =>
    l.textContent?.startsWith(text),
  );
  const control = label?.control;
  if (!(control instanceof HTMLInputElement)) throw new Error(`no input labelled ${text}`);
  return control;
}

function describedText(control: HTMLElement): string {
  return (control.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? `#${id} missing`)
    .join(' | ');
}

function type(control: HTMLInputElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

const onSubmit = vi.fn<(event: Event) => void>();

function Form(): JSX.Element {
  return (
    <form
      noValidate={false}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event.nativeEvent);
      }}
    >
      <Field
        label="Title"
        description="Shown on product pages."
        required
        messages={{ valueMissing: 'Enter a product title' }}
      >
        <Control />
      </Field>
      <Field label="Email" validateOn="blur">
        <Control type="email" name="email" />
      </Field>
      <Field label="Price" error="Enter a price above zero.">
        <Control name="price" defaultValue="0" />
      </Field>
      <Field label="Notes" description="Optional.">
        {(control) => <input {...control} />}
      </Field>
      <Fieldset legend="Delivery" description="Pick one.">
        <label>
          <input type="radio" name="delivery" value="standard" /> Standard
        </label>
      </Fieldset>
      <button type="submit">Save</button>
    </form>
  );
}

describe('SSR then hydration', () => {
  test('a Field with a client control hydrates with no mismatch and leaves the DOM unchanged', async () => {
    const { container, html, problems } = await hydrate(<Form />);
    expect(problems).toEqual([]);
    // hydration adopted the server DOM as it was (compared after the same HTML parse)
    const parsed = document.createElement('div');
    parsed.innerHTML = html;
    expect(container.innerHTML).toBe(parsed.innerHTML);

    const title = byLabel(container, 'Title');
    expect(title.required).toBe(true);
    expect(describedText(title)).toBe('Shown on product pages.');
    expect(title.hasAttribute('aria-invalid')).toBe(false);

    const price = byLabel(container, 'Price');
    expect(price.getAttribute('aria-invalid')).toBe('true');
    expect(describedText(price)).toBe('Enter a price above zero.');

    const notes = byLabel(container, 'Notes');
    expect(describedText(notes)).toBe('Optional.');

    const fieldset = container.querySelector('fieldset');
    expect(fieldset?.getAttribute('aria-describedby')?.split(' ').length).toBe(1);
  });
  test('the harness bites: a server/client difference is reported', async () => {
    const html = renderToString(<p>server</p>);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const problems: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
    roots.push(
      hydrateRoot(container, <p>client</p>, { onRecoverableError: (e) => problems.push(e) }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(problems.length).toBeGreaterThan(0);
  });
});

/** A consumer that handles `invalid` itself. */
function Owned(): JSX.Element {
  return (
    <form>
      <Field label="Code">
        <Control required onInvalid={(event) => event.preventDefault()} />
      </Field>
    </form>
  );
}

describe('native validation through FieldScope', () => {
  test('submit: the message renders inline, the first invalid control takes focus, no submit', async () => {
    const { container } = await hydrate(<Form />);
    const title = byLabel(container, 'Title');
    const email = byLabel(container, 'Email');
    type(email, 'not-an-email');
    container.querySelector('form')?.requestSubmit();
    await vi.waitFor(() => expect(title.getAttribute('aria-invalid')).toBe('true'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(title);
    // description first, then the error (§16.1), from `messages`
    expect(describedText(title)).toBe('Shown on product pages. | Enter a product title');
    const field = title.closest('[data-slot="field"]');
    expect(field?.hasAttribute('data-invalid')).toBe(true);
    expect(field?.querySelector('[data-slot="field-error"]')?.getAttribute('class')).toBe(
      'nz-inline-error nz-field-error',
    );
    // the browser's own message for a control without `messages`
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(describedText(email)).toBe(email.validationMessage);
    // exactly one error part per invalid field (§9.6 case 5), and never a live region (§16.5)
    expect(container.querySelectorAll('[data-slot="field-error"]')).toHaveLength(3);
    expect(container.querySelector('[aria-live], [role="alert"], [role="status"]')).toBeNull();
  });

  test('focus lands after the error is wired: aria-invalid and the error id are set at focusin', async () => {
    const { container } = await hydrate(<Form />);
    const title = byLabel(container, 'Title');
    const seen: { invalid: string | null; described: string }[] = [];
    title.addEventListener('focusin', () =>
      seen.push({ invalid: title.getAttribute('aria-invalid'), described: describedText(title) }),
    );
    container.querySelector('form')?.requestSubmit();
    await vi.waitFor(() => expect(document.activeElement).toBe(title));
    expect(seen).toEqual([
      { invalid: 'true', described: 'Shown on product pages. | Enter a product title' },
    ]);
  });

  test('typing updates the message silently and clears it once the value is valid', async () => {
    const { container } = await hydrate(<Form />);
    const email = byLabel(container, 'Email');
    type(email, 'x');
    container.querySelector('form')?.requestSubmit();
    await vi.waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    type(email, 'x@');
    await vi.waitFor(() => expect(describedText(email)).toBe(email.validationMessage));
    type(email, 'x@example.com');
    await vi.waitFor(() => expect(email.hasAttribute('aria-invalid')).toBe(false));
    expect(email.hasAttribute('aria-describedby')).toBe(false);
    expect(email.closest('[data-slot="field"]')?.hasAttribute('data-invalid')).toBe(false);
  });

  test('the error prop is never cleared by typing', async () => {
    const { container } = await hydrate(<Form />);
    const price = byLabel(container, 'Price');
    type(price, '12');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(price.getAttribute('aria-invalid')).toBe('true');
    expect(describedText(price)).toBe('Enter a price above zero.');
  });

  test('validateOn="blur": leaving the control shows the message and does not pull focus back', async () => {
    const { container } = await hydrate(<Form />);
    const email = byLabel(container, 'Email');
    const title = byLabel(container, 'Title');
    email.focus();
    type(email, 'nope');
    title.focus();
    await vi.waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    expect(document.activeElement).toBe(title);
    // a field without validateOn="blur" shows nothing on blur
    title.blur();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(title.hasAttribute('aria-invalid')).toBe(false);
  });

  test('a consumer onInvalid that prevents default takes over: no inline message', async () => {
    const { container } = await hydrate(<Owned />);
    container.querySelector('form')?.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
  });
});

describe('Fieldset layout', () => {
  test('the native legend sits at the top of the box, then the legend gap, then the rows', async () => {
    const { container } = await hydrate(
      <Fieldset legend="Delivery" description="Pick one.">
        <label>
          <input type="radio" name="d" /> Standard
        </label>
      </Fieldset>,
    );
    const fieldset = container.querySelector('fieldset');
    const legend = container.querySelector('legend');
    const first = container.querySelector('[data-slot="fieldset-content"] > label');
    if (fieldset === null || legend === null || first === null) throw new Error('missing parts');
    const box = fieldset.getBoundingClientRect();
    const top = legend.getBoundingClientRect();
    expect(top.top).toBe(box.top);
    expect(Math.round(first.getBoundingClientRect().top - top.bottom)).toBe(8);
    expect(getComputedStyle(fieldset).borderTopWidth).toBe('0px');
  });

  test('disabled disables every control inside natively', async () => {
    const { container } = await hydrate(
      <Fieldset legend="Delivery" disabled>
        <Field label="Note">
          <Control />
        </Field>
      </Fieldset>,
    );
    const note = byLabel(container, 'Note');
    expect(note.matches(':disabled')).toBe(true);
    expect(note.hasAttribute('disabled')).toBe(false);
  });
});

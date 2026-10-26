// NumberField in a browser (ARCHITECTURE.md §16.1): hydration, typing and the commit on blur (parsed,
// clamped and formatted in the locale), the arrow keys, the step buttons (out of the tab order, a
// press keeps focus, disabled at the ends), the hidden input's plain number in FormData, controlled
// use, and a Field's required message.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NizivoConfig } from '../../src/config/config.client';
import { Field } from '../../src/field/field';
import { NumberField } from '../../src/number-field/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/input/input.css',
    '../../src/number-field/number-field.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 6)
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

async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  // React Aria's native validation sets title="" after hydration (no browser tooltip on hover), an
  // effect and not a mismatch
  expect(container.innerHTML.replaceAll(' title=""', '')).toBe(before);
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

function parts(container: ParentNode): {
  input: HTMLInputElement;
  minus: HTMLButtonElement | null;
  plus: HTMLButtonElement | null;
} {
  const input = container.querySelector('.nz-number-field-input');
  if (!(input instanceof HTMLInputElement)) throw new Error('no NumberField');
  return {
    input,
    minus: container.querySelector<HTMLButtonElement>('.nz-number-field-decrement'),
    plus: container.querySelector<HTMLButtonElement>('.nz-number-field-increment'),
  };
}

type OnValueChange = (value: number | null, details: { reason: string }) => void;

function Stepped(props: { onValueChange?: OnValueChange; max?: number }): JSX.Element {
  return (
    <NumberField.Root aria-label="Stock" defaultValue={1} min={0} {...props}>
      <NumberField.Decrement />
      <NumberField.Input />
      <NumberField.Increment />
    </NumberField.Root>
  );
}

describe('typing and committing', () => {
  test('hydrates with no mismatch or warning; a typed price is formatted on blur and reported', async () => {
    const onValueChange = vi.fn<OnValueChange>();
    const { container, problems } = await hydrate(
      <NumberField.Root
        aria-label="Price"
        formatOptions={{ style: 'currency', currency: 'EUR' }}
        onValueChange={onValueChange}
      >
        <NumberField.Input />
      </NumberField.Root>,
    );
    expect(problems).toEqual([]);
    const { input } = parts(container);
    await userEvent.type(input, '12.5');
    // nothing is committed while typing
    expect(onValueChange).not.toHaveBeenCalled();
    input.blur();
    await settle();
    expect(input.value).toBe('€12.50');
    expect(onValueChange).toHaveBeenLastCalledWith(
      12.5,
      expect.objectContaining({ reason: 'unknown' }),
    );
  });

  test('a value over max is clamped on commit; a cleared field reports null', async () => {
    const onValueChange = vi.fn<OnValueChange>();
    const container = await mount(
      <NumberField.Root aria-label="Discount" max={100} onValueChange={onValueChange}>
        <NumberField.Input />
      </NumberField.Root>,
    );
    const { input } = parts(container);
    await userEvent.type(input, '150');
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(input.value).toBe('100');
    expect(onValueChange).toHaveBeenLastCalledWith(100, expect.anything());
    await userEvent.clear(input);
    input.blur();
    await settle();
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.anything());
  });

  test('de-DE: a typed "1.234,5" is 1234.5, and the form gets the plain number', async () => {
    const container = await mount(
      <NizivoConfig locale="de-DE">
        <form>
          <NumberField.Root
            aria-label="Preis"
            name="price"
            formatOptions={{ style: 'currency', currency: 'EUR' }}
          >
            <NumberField.Input />
          </NumberField.Root>
        </form>
      </NizivoConfig>,
    );
    const { input } = parts(container);
    await userEvent.type(input, '1.234,5');
    input.blur();
    await settle();
    expect(input.value).toBe('1.234,50 €');
    expect(new FormData(container.querySelector('form') ?? undefined).get('price')).toBe('1234.5');
  });
});

describe('stepping', () => {
  test('the arrow keys step by step; Tab skips the step buttons', async () => {
    const container = await mount(
      <>
        <button type="button">before</button>
        <Stepped />
        <input aria-label="after" />
      </>,
    );
    const { input } = parts(container);
    container.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(input.value).toBe('2');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(input.value).toBe('0');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(container.querySelector('input[aria-label="after"]'));
  });

  test('the buttons step it, keep focus on the input, and disable at max', async () => {
    const onValueChange = vi.fn<OnValueChange>();
    const container = await mount(<Stepped max={2} onValueChange={onValueChange} />);
    const { input, plus, minus } = parts(container);
    if (plus === null || minus === null) throw new Error('no step buttons');
    input.focus();
    await userEvent.click(plus);
    await settle();
    expect(input.value).toBe('2');
    expect(onValueChange).toHaveBeenLastCalledWith(2, expect.anything());
    expect(plus.disabled).toBe(true);
    expect(minus.disabled).toBe(false);
    await userEvent.click(minus);
    await settle();
    expect(input.value).toBe('1');
  });
});

/** A stock line: its count in state, shown beside the field. */
function Line(): JSX.Element {
  const [stock, setStock] = useState<number | null>(3);
  return (
    <>
      <NumberField.Root aria-label="Stock" value={stock} onValueChange={setStock}>
        <NumberField.Input />
        <NumberField.Increment />
      </NumberField.Root>
      <output>{stock}</output>
    </>
  );
}

describe('controlled', () => {
  test('value and onValueChange: a step updates the state', async () => {
    const container = await mount(<Line />);
    const { plus } = parts(container);
    if (plus === null) throw new Error('no step button');
    await userEvent.click(plus);
    await settle();
    expect(container.querySelector('output')?.textContent).toBe('4');
  });
});

describe('inside a Field', () => {
  test('a required, empty price: the message inline and focus on the input, no submit', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field name="price" label="Price" required messages={{ valueMissing: 'Enter a price.' }}>
          <NumberField.Root formatOptions={{ style: 'currency', currency: 'USD' }}>
            <NumberField.Input />
          </NumberField.Root>
        </Field>
        <button type="submit">Save</button>
      </form>,
    );
    const { input } = parts(container);
    await userEvent.click(container.querySelector('button[type="submit"]') ?? input);
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain('Enter a price.');
  });
});

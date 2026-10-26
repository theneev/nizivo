// QuantityStepper in a browser (ARCHITECTURE.md §16.1): hydration, the buttons (stepping, the native
// input and change events, the ends of the range, focus that stays where it was), the arrow keys
// from the native spinbutton, controlled use, Tab reaching only the input, form data, and Field
// validation of a typed fraction.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { QuantityStepper } from '../../src/quantity-stepper/quantity-stepper.client';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/input/input.css',
    '../../src/quantity-stepper/quantity-stepper.css',
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
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(container.innerHTML).toBe(before);
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
  box: HTMLElement;
  input: HTMLInputElement;
  minus: HTMLButtonElement;
  plus: HTMLButtonElement;
} {
  const box = container.querySelector('.nz-quantity-stepper');
  const input = container.querySelector('.nz-quantity-stepper-control');
  const minus = container.querySelector('[data-slot="quantity-stepper-decrement"]');
  const plus = container.querySelector('[data-slot="quantity-stepper-increment"]');
  if (
    !(box instanceof HTMLElement) ||
    !(input instanceof HTMLInputElement) ||
    !(minus instanceof HTMLButtonElement) ||
    !(plus instanceof HTMLButtonElement)
  ) {
    throw new Error('no QuantityStepper');
  }
  return { box, input, minus, plus };
}

type OnValueChange = (value: number | null, details: { reason: string }) => void;

describe('the buttons', () => {
  test('hydrate with no mismatch; plus and minus step the value and report the press', async () => {
    const onValueChange = vi.fn<OnValueChange>();
    const onChange = vi.fn<() => void>();
    const { container, problems } = await hydrate(
      <QuantityStepper
        aria-label="Quantity"
        min={1}
        max={3}
        defaultValue={1}
        onValueChange={onValueChange}
        onChange={onChange}
      />,
    );
    expect(problems).toEqual([]);
    const { input, minus, plus } = parts(container);
    expect(minus.disabled).toBe(true);

    await userEvent.click(plus);
    expect(input.value).toBe('2');
    expect(onValueChange).toHaveBeenLastCalledWith(
      2,
      expect.objectContaining({ reason: 'increment' }),
    );
    // React's onChange runs too: the press is an ordinary input event
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(minus.disabled).toBe(false);

    await userEvent.click(plus);
    expect(input.value).toBe('3');
    expect(plus.disabled).toBe(true);

    await userEvent.click(minus);
    expect(input.value).toBe('2');
    expect(onValueChange).toHaveBeenLastCalledWith(
      2,
      expect.objectContaining({ reason: 'decrement' }),
    );
  });

  test('a press keeps focus where it was: on the input, or nowhere', async () => {
    const container = await mount(<QuantityStepper aria-label="Quantity" defaultValue={1} />);
    const { input, plus } = parts(container);
    await userEvent.click(plus);
    expect(document.activeElement).not.toBe(plus);
    input.focus();
    await userEvent.click(plus);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('3');
  });

  test('an empty input: plus starts at min', async () => {
    const container = await mount(<QuantityStepper aria-label="Quantity" min={1} />);
    const { input, plus } = parts(container);
    expect(input.value).toBe('');
    await userEvent.click(plus);
    expect(input.value).toBe('1');
  });

  test('the step: plus adds it, and the native change event reaches the form', async () => {
    const onFormChange = vi.fn<() => void>();
    const container = await mount(
      <form onChangeCapture={onFormChange}>
        <QuantityStepper aria-label="Packs of 6" name="qty" min={0} step={6} defaultValue={6} />
      </form>,
    );
    const { input, plus } = parts(container);
    const native = vi.fn<() => void>();
    input.form?.addEventListener('change', native);
    await userEvent.click(plus);
    expect(input.value).toBe('12');
    expect(native).toHaveBeenCalledTimes(1);
    expect(new FormData(input.form ?? undefined).get('qty')).toBe('12');
  });

  test('read-only: the buttons are disabled and the value stays', async () => {
    const container = await mount(
      <QuantityStepper aria-label="Quantity" defaultValue={4} readOnly />,
    );
    const { input, minus, plus } = parts(container);
    expect(minus.disabled && plus.disabled).toBe(true);
    plus.click();
    await settle();
    expect(input.value).toBe('4');
  });
});

describe('the keyboard', () => {
  test('Tab reaches only the input; the arrow keys step it natively, within the range', async () => {
    const onValueChange = vi.fn<OnValueChange>();
    const container = await mount(
      <>
        <button type="button">before</button>
        <QuantityStepper
          aria-label="Quantity"
          min={1}
          max={2}
          defaultValue={1}
          onValueChange={onValueChange}
        />
        <input aria-label="after" />
      </>,
    );
    const { input } = parts(container);
    container.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(input.value).toBe('2');
    expect(onValueChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ reason: 'input' }));
    await userEvent.keyboard('{ArrowUp}');
    expect(input.value).toBe('2');
    await userEvent.keyboard('{ArrowDown}');
    expect(input.value).toBe('1');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(container.querySelector('input[aria-label="after"]'));
  });

  test('typing reports the number, and null while empty', async () => {
    const onValueChange = vi.fn<OnValueChange>();
    const container = await mount(
      <QuantityStepper aria-label="Quantity" onValueChange={onValueChange} />,
    );
    const { input } = parts(container);
    await userEvent.type(input, '7');
    expect(onValueChange).toHaveBeenLastCalledWith(7, expect.objectContaining({ reason: 'input' }));
    await userEvent.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({ reason: 'input' }),
    );
  });
});

/** A cart line: its quantity in state, shown beside the stepper. */
function Cart(): JSX.Element {
  const [quantity, setQuantity] = useState<number | null>(1);
  return (
    <>
      <QuantityStepper
        aria-label="Quantity"
        min={1}
        max={2}
        value={quantity}
        onValueChange={setQuantity}
      />
      <output>{quantity}</output>
    </>
  );
}

describe('controlled', () => {
  test('value and onValueChange: a press updates the state, which disables plus at max', async () => {
    const container = await mount(<Cart />);
    const { input, plus } = parts(container);
    await userEvent.click(plus);
    await settle();
    expect(input.value).toBe('2');
    expect(container.querySelector('output')?.textContent).toBe('2');
    expect(plus.disabled).toBe(true);
  });
});

describe('inside a Field', () => {
  test('a typed fraction: stepMismatch inline and focus on the input, no submit', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        noValidate={false}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Quantity" messages={{ stepMismatch: 'Choose a whole number.' }}>
          <QuantityStepper min={1} />
        </Field>
        <button type="submit">Add to cart</button>
      </form>,
    );
    const { input } = parts(container);
    await userEvent.type(input, '1.5');
    await userEvent.click(container.querySelector('button[type="submit"]') ?? input);
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(error?.textContent).toBe('Choose a whole number.');
  });

  test('a press on the box’s padding focuses the input', async () => {
    const container = await mount(<QuantityStepper aria-label="Quantity" />);
    const { box, input } = parts(container);
    await userEvent.click(box, { position: { x: 1, y: box.getBoundingClientRect().height / 2 } });
    expect(document.activeElement).toBe(input);
  });
});

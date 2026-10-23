// ChoiceCard in Chromium (ARCHITECTURE.md §9.5, §16.1; figma/05 §3.6): real radios give the APG
// radio-group keyboard, forms and reset; the server HTML hydrates unchanged; a required group inside
// a Field shows its message inline; the Field's error marks the chosen card; selecting never changes
// a card's size; the radio is visible and the card is the target.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { ChoiceCard, ChoiceCardGroup } from '../../src/choice-card/index';
import {
  ChoiceCardDeliveryExample,
  ChoiceCardExample,
  ChoiceCardInvalidExample,
} from '../../src/choice-card/choice-card.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/choice-card/choice-card.css',
    '../../src/badge/badge.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 6)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const html = renderToString(app);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  const parsed = document.createElement('template');
  parsed.innerHTML = html;
  expect(container.innerHTML).toBe(parsed.innerHTML);
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

function radios(container: ParentNode): HTMLInputElement[] {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
}

function cards(container: ParentNode): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="choice-card"]')];
}

function element(node: Element | null | undefined): HTMLElement {
  if (!(node instanceof HTMLElement)) throw new Error('no element');
  return node;
}

function checked(container: ParentNode): string | undefined {
  return radios(container).find((radio) => radio.checked)?.value;
}

function Controlled(): JSX.Element {
  const [value, setValue] = useState('a');
  return (
    <>
      <output>{value}</output>
      <ChoiceCardGroup aria-label="Delivery" value={value} onValueChange={setValue}>
        <ChoiceCard value="a">A</ChoiceCard>
        <ChoiceCard value="b">B</ChoiceCard>
      </ChoiceCardGroup>
    </>
  );
}

describe('ChoiceCard', () => {
  test('every example hydrates with no mismatch and no console error', async () => {
    const { problems } = await hydrate(
      <div>
        <ChoiceCardExample />
        <ChoiceCardDeliveryExample />
        <ChoiceCardInvalidExample />
      </div>,
    );
    expect(problems).toEqual([]);
  });

  test('Tab enters at the checked card; arrows move and select, skipping a disabled card', async () => {
    const container = await mount(
      <div>
        <button type="button">before</button>
        <ChoiceCardGroup aria-label="Delivery" defaultValue="b">
          <ChoiceCard value="a">A</ChoiceCard>
          <ChoiceCard value="b">B</ChoiceCard>
          <ChoiceCard value="c" disabled>
            C
          </ChoiceCard>
          <ChoiceCard value="d">D</ChoiceCard>
        </ChoiceCardGroup>
        <button type="button">after</button>
      </div>,
    );
    const [before, after] = container.querySelectorAll('button');
    before?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(radios(container)[1]);
    await userEvent.keyboard('{ArrowDown}');
    expect(checked(container)).toBe('d');
    await settle(10);
    expect(cards(container)[3]?.hasAttribute('data-focus-visible')).toBe(true);
    expect(getComputedStyle(element(cards(container)[3])).outlineStyle).toBe('solid');
    // the radio draws no outline of its own; the card does
    expect(getComputedStyle(element(radios(container)[3])).outlineStyle).toBe('none');
    await userEvent.keyboard('{ArrowUp}');
    expect(checked(container)).toBe('b');
    await userEvent.tab();
    expect(document.activeElement).toBe(after);
  });

  test('a press anywhere on the card checks it; controlled, the parent owns the value', async () => {
    const container = await mount(<Controlled />);
    await userEvent.click(element(cards(container)[1]));
    expect(container.querySelector('output')?.textContent).toBe('b');
    expect(checked(container)).toBe('b');
    expect(cards(container)[1]?.hasAttribute('data-focus-visible')).toBe(false);
  });

  test('a named group submits its value, and form.reset() returns to the default', async () => {
    const container = await mount(
      <form>
        <ChoiceCardExample />
      </form>,
    );
    const form = container.querySelector('form');
    if (form === null) throw new Error('no form');
    expect(new FormData(form).get('paymentMethod')).toBe('pm_1');
    radios(container)[1]?.click();
    expect(new FormData(form).get('paymentMethod')).toBe('pm_2');
    form.reset();
    expect(new FormData(form).get('paymentMethod')).toBe('pm_1');
  });

  test('required in a Field: submit shows the message inline, focuses the first radio, choosing clears it', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field group label="Delivery" name="d" required messages={{ valueMissing: 'Choose one.' }}>
          <ChoiceCardGroup>
            <ChoiceCard value="standard">Standard</ChoiceCard>
            <ChoiceCard value="express">Express</ChoiceCard>
          </ChoiceCardGroup>
        </Field>
      </form>,
    );
    const form = container.querySelector('form');
    const group = container.querySelector<HTMLElement>('[role="radiogroup"]');
    if (form === null || group === null) throw new Error('no form');
    form.requestSubmit();
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe('Choose one.');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(radios(container)[0]);
    await userEvent.click(element(cards(container)[1]));
    await settle();
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    form.requestSubmit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('the Field error marks the chosen card critical, not brand', async () => {
    const valid = await mount(<ChoiceCardExample />);
    const invalid = await mount(<ChoiceCardInvalidExample />);
    const ring = (container: HTMLElement): string =>
      getComputedStyle(element(container.querySelector('[data-slot="choice-card"]'))).boxShadow;
    expect(ring(valid)).toMatch(/ 2px inset$/);
    expect(ring(invalid)).toMatch(/ 2px inset$/);
    expect(ring(invalid)).not.toBe(ring(valid));
    const group = element(invalid.querySelector('[role="radiogroup"]'));
    const error = element(invalid.querySelector('[data-slot="field-error"]'));
    expect(group.getAttribute('aria-describedby')).toContain(error.id);
  });

  test('selecting never changes a card size; a two-line card is 76 px; the radio is a 20 px circle', async () => {
    const container = await mount(<ChoiceCardExample />);
    const sizes = (): number[][] =>
      cards(container).map((card) => {
        const box = card.getBoundingClientRect();
        return [box.width, box.height];
      });
    const before = sizes();
    expect(before.map(([, height]) => height)).toEqual([76, 76]);
    radios(container)[1]?.click();
    await settle(300);
    expect(sizes()).toEqual(before);
    const radio = element(radios(container)[0]).getBoundingClientRect();
    expect([radio.width, radio.height]).toEqual([20, 20]);
  });
});

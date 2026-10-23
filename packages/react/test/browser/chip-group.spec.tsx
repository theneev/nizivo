// ChipGroup in Chromium (ARCHITECTURE.md §9.5, §16.1; figma/05 §3.2): native radios give the APG
// radio-group keyboard, checkboxes (`multiple`) one Tab stop each; forms, reset and Field validation;
// the server HTML hydrates unchanged; selection never changes a chip's size; an unavailable chip keeps
// its colour, is struck through and can still be chosen.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { ChangeDetails } from '../../src/contracts/details';
import { Field } from '../../src/field/field';
import { Chip, ChipGroup } from '../../src/chip-group/index';
import {
  ChipGroupErrorExample,
  ChipGroupExample,
  ChipGroupMultipleExample,
  ChipGroupSizesExample,
} from '../../src/chip-group/chip-group.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/chip-group/chip-group.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/stack/stack.css',
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

function inputs(container: ParentNode): HTMLInputElement[] {
  return [...container.querySelectorAll<HTMLInputElement>('input[data-slot="chip-input"]')];
}

function chips(container: ParentNode): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="chip"]')];
}

function element(node: Element | null | undefined): HTMLElement {
  if (!(node instanceof HTMLElement)) throw new Error('no element');
  return node;
}

function checked(container: ParentNode): string[] {
  return inputs(container)
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function Controlled(): JSX.Element {
  const [value, setValue] = useState<string[]>(['a']);
  return (
    <>
      <output>{value.join(',')}</output>
      <ChipGroup aria-label="Filters" multiple value={value} onValueChange={setValue}>
        <Chip value="a">A</Chip>
        <Chip value="b">B</Chip>
        <Chip value="c">C</Chip>
      </ChipGroup>
    </>
  );
}

describe('ChipGroup', () => {
  test('every example hydrates with no mismatch and no console error', async () => {
    const { problems } = await hydrate(
      <div>
        <ChipGroupExample />
        <ChipGroupSizesExample />
        <ChipGroupMultipleExample />
        <ChipGroupErrorExample />
      </div>,
    );
    expect(problems).toEqual([]);
  });

  test('one value: Tab enters at the checked chip; arrows move and select, skipping disabled ones', async () => {
    const onValueChange = vi.fn<(value: string, details: ChangeDetails<'input'>) => void>();
    const container = await mount(
      <div>
        <button type="button">before</button>
        <ChipGroup aria-label="Size" defaultValue="s" onValueChange={onValueChange}>
          <Chip value="xs" unavailable>
            XS
          </Chip>
          <Chip value="s">S</Chip>
          <Chip value="m" disabled>
            M
          </Chip>
          <Chip value="l">L</Chip>
        </ChipGroup>
      </div>,
    );
    container.querySelector('button')?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(inputs(container)[1]);
    await userEvent.keyboard('{ArrowRight}');
    expect(checked(container)).toEqual(['l']);
    expect(document.activeElement).toBe(inputs(container)[3]);
    await settle(10);
    expect(chips(container)[3]?.hasAttribute('data-focus-visible')).toBe(true);
    expect(getComputedStyle(element(chips(container)[3])).outlineStyle).toBe('solid');
    // an unavailable chip is still a choice
    await userEvent.keyboard('{ArrowRight}');
    expect(checked(container)).toEqual(['xs']);
    expect(onValueChange).toHaveBeenLastCalledWith('xs', {
      reason: 'input',
      event: expect.any(Event),
    });
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  test('multiple: each checkbox is a Tab stop; Space toggles; the callback gets every checked value', async () => {
    const container = await mount(<Controlled />);
    const output = (): string | null | undefined => container.querySelector('output')?.textContent;
    inputs(container)[0]?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(inputs(container)[1]);
    await userEvent.keyboard(' ');
    expect(output()).toBe('a,b');
    await userEvent.click(element(chips(container)[0]));
    expect(output()).toBe('b');
    expect(checked(container)).toEqual(['b']);
  });

  test('forms: one value submits under the name, multiple one entry each; reset returns to the defaults', async () => {
    const container = await mount(
      <form>
        <ChipGroup aria-label="Size" name="size" defaultValue="m">
          <Chip value="s">S</Chip>
          <Chip value="m">M</Chip>
        </ChipGroup>
        <ChipGroup aria-label="Status" name="status" multiple defaultValue={['open']}>
          <Chip value="open">Open</Chip>
          <Chip value="paid">Paid</Chip>
        </ChipGroup>
      </form>,
    );
    const form = container.querySelector('form');
    if (form === null) throw new Error('no form');
    expect(new FormData(form).get('size')).toBe('m');
    expect(new FormData(form).getAll('status')).toEqual(['open']);
    inputs(container)[0]?.click();
    inputs(container)[3]?.click();
    expect(new FormData(form).get('size')).toBe('s');
    expect(new FormData(form).getAll('status')).toEqual(['open', 'paid']);
    form.reset();
    expect(new FormData(form).get('size')).toBe('m');
    expect(new FormData(form).getAll('status')).toEqual(['open']);
  });

  test('required in a Field: submit shows the message inline, focuses the group, and choosing clears it', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field group label="Fit" name="fit" required messages={{ valueMissing: 'Choose a fit.' }}>
          <ChipGroup>
            <Chip value="regular">Regular</Chip>
            <Chip value="slim">Slim</Chip>
          </ChipGroup>
        </Field>
      </form>,
    );
    const form = container.querySelector('form');
    const group = container.querySelector<HTMLElement>('[role="radiogroup"]');
    if (form === null || group === null) throw new Error('no form');
    form.requestSubmit();
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe('Choose a fit.');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.getAttribute('aria-labelledby')).toBe(container.querySelector('label')?.id);
    expect(document.activeElement).toBe(inputs(container)[0]);
    await userEvent.click(element(chips(container)[1]));
    await settle();
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    form.requestSubmit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('selecting never changes a chip size; the selection is a 2 px ring', async () => {
    const container = await mount(<ChipGroupExample />);
    const boxes = (): number[][] =>
      chips(container).map((chip) => {
        const box = chip.getBoundingClientRect();
        return [box.width, box.height];
      });
    const before = boxes();
    inputs(container)[1]?.click();
    await settle(300);
    expect(boxes()).toEqual(before);
    expect(getComputedStyle(element(chips(container)[1])).boxShadow).toMatch(
      / 0px 0px 0px 2px inset$/,
    );
    expect(getComputedStyle(element(chips(container)[0])).boxShadow).toMatch(
      / 0px 0px 0px 1px inset$/,
    );
  });

  test('40 px high; a text chip at least 48 px wide; the swatch is a 24 px circle', async () => {
    const container = await mount(
      <div>
        <ChipGroupExample />
        <ChipGroupSizesExample />
      </div>,
    );
    for (const chip of chips(container)) {
      const box = chip.getBoundingClientRect();
      expect(box.height).toBe(40);
      expect(box.width).toBeGreaterThanOrEqual(48);
    }
    const swatch = element(container.querySelector('[data-slot="chip-leading"]'));
    expect([swatch.offsetWidth, swatch.offsetHeight]).toEqual([24, 24]);
  });

  test('unavailable keeps its colour, is struck through and is described', async () => {
    const container = await mount(<ChipGroupExample />);
    const sand = element(chips(container)[2]);
    const swatch = element(sand.querySelector('[data-slot="chip-leading"] > span'));
    expect(getComputedStyle(swatch).backgroundColor).toBe('rgb(233, 220, 195)');
    const strike = element(sand.querySelector('[data-slot="chip-strike"]'));
    expect(getComputedStyle(strike).backgroundImage).toMatch(/linear-gradient/);
    const input = element(sand.querySelector('input'));
    const note = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(note?.textContent).toBe('Sold out');
    expect(note?.hidden).toBe(true);
    expect(input.matches(':disabled')).toBe(false);
  });
});

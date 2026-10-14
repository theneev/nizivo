// SegmentedControl in Chromium (ARCHITECTURE.md §9.5, §8.5, §16.1): native radios give the APG
// radio-group keyboard, forms and reset; the server HTML hydrates unchanged; a required group inside a
// Field shows its message inline; the selected weight never shifts the items.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { ChangeDetails } from '../../src/contracts/details';
import { Field } from '../../src/field/field';
import { SegmentedControl } from '../../src/segmented-control/index';
import {
  SegmentedControlExample,
  SegmentedControlFieldExample,
  SegmentedControlSizesExample,
  SegmentedControlStatesExample,
} from '../../src/segmented-control/segmented-control.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/segmented-control/segmented-control.css',
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

function Controlled(): JSX.Element {
  const [value, setValue] = useState('7d');
  return (
    <>
      <output>{value}</output>
      <SegmentedControl.Root aria-label="Range" value={value} onValueChange={setValue}>
        <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
        <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
      </SegmentedControl.Root>
    </>
  );
}

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
  // the DOM is unchanged (serialised the way the browser serialises the server HTML)
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

function element(node: Element | null | undefined): HTMLElement {
  if (!(node instanceof HTMLElement)) throw new Error('no element');
  return node;
}

function checked(container: ParentNode): string | undefined {
  return radios(container).find((radio) => radio.checked)?.value;
}

describe('SegmentedControl', () => {
  test('every example hydrates with no mismatch and no console error', async () => {
    const { problems } = await hydrate(
      <div>
        <SegmentedControlExample />
        <SegmentedControlSizesExample />
        <SegmentedControlStatesExample />
        <SegmentedControlFieldExample />
      </div>,
    );
    expect(problems).toEqual([]);
  });

  test('Tab enters at the checked item; arrows move and select (APG radio group)', async () => {
    const onValueChange = vi.fn<(value: string, details: ChangeDetails<'input'>) => void>();
    const container = await mount(
      <div>
        <button type="button">before</button>
        <SegmentedControl.Root aria-label="Range" defaultValue="30d" onValueChange={onValueChange}>
          <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
          <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
          <SegmentedControl.Item value="90d" disabled>
            90D
          </SegmentedControl.Item>
          <SegmentedControl.Item value="12m">12M</SegmentedControl.Item>
        </SegmentedControl.Root>
      </div>,
    );
    container.querySelector('button')?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(radios(container)[1]);
    await userEvent.keyboard('{ArrowRight}');
    // the disabled item is skipped
    expect(checked(container)).toBe('12m');
    expect(document.activeElement).toBe(radios(container)[3]);
    // marked by the leaf too, because WebKit matches no :focus-visible after an arrow key
    await settle(10);
    expect(radios(container)[3]?.parentElement?.hasAttribute('data-focus-visible')).toBe(true);
    expect(radios(container)[1]?.parentElement?.hasAttribute('data-focus-visible')).toBe(false);
    // and nz.base's nested-input rule outlines it, in every engine
    const item = radios(container)[3]?.parentElement;
    expect(item ? getComputedStyle(item).outlineStyle : '').toBe('solid');
    expect(onValueChange).toHaveBeenLastCalledWith('12m', {
      reason: 'input',
      event: expect.any(Event),
    });
    await userEvent.keyboard('{ArrowLeft}');
    expect(checked(container)).toBe('30d');
    await userEvent.keyboard('{ArrowLeft}');
    expect(checked(container)).toBe('7d');
    expect(onValueChange).toHaveBeenCalledTimes(3);
  });

  test('nothing selected, hydrated: the group is one Tab stop, both ways', async () => {
    // Re-rendering a focused radio makes React re-write its name; Chromium then gave every unchecked
    // radio its own Tab stop. The item marks focus on the DOM, so focus never re-renders it.
    const { container } = await hydrate(
      <div>
        <button type="button">before</button>
        <SegmentedControl.Root aria-label="Speed" name="speed">
          <SegmentedControl.Item value="standard">Standard</SegmentedControl.Item>
          <SegmentedControl.Item value="express">Express</SegmentedControl.Item>
          <SegmentedControl.Item value="same-day">Same day</SegmentedControl.Item>
        </SegmentedControl.Root>
        <button type="button">after</button>
      </div>,
    );
    const [before, after] = container.querySelectorAll('button');
    before?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(radios(container)[0]);
    await userEvent.tab();
    expect(document.activeElement).toBe(after);
    // Chromium enters an unchecked group at its first radio from either side
    await userEvent.tab({ shift: true });
    expect(radios(container)).toContain(document.activeElement);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(before);
  });

  test('the focused item shows its own outline target: the label wraps the focused radio', async () => {
    const container = await mount(<SegmentedControlExample />);
    await userEvent.tab();
    const item = document.activeElement?.parentElement;
    expect(item?.dataset['slot']).toBe('segmented-control-item');
    expect(item?.matches(':has(> input:focus-visible)')).toBe(true);
    expect(container.contains(item ?? null)).toBe(true);
  });

  test('controlled: the parent owns the value', async () => {
    const container = await mount(<Controlled />);
    const second = container.querySelectorAll('label')[1];
    if (second === undefined) throw new Error('no item');
    await userEvent.click(second);
    expect(container.querySelector('output')?.textContent).toBe('30d');
    expect(checked(container)).toBe('30d');
    // a pointer selection draws no focus outline
    expect(second.hasAttribute('data-focus-visible')).toBe(false);
  });

  test('a named group submits its value, and form.reset() returns to the default', async () => {
    const container = await mount(
      <form>
        <SegmentedControl.Root aria-label="Range" name="range" defaultValue="30d">
          <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
          <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
        </SegmentedControl.Root>
      </form>,
    );
    const form = container.querySelector('form');
    if (form === null) throw new Error('no form');
    expect(new FormData(form).get('range')).toBe('30d');
    radios(container)[0]?.click();
    expect(new FormData(form).get('range')).toBe('7d');
    form.reset();
    expect(new FormData(form).get('range')).toBe('30d');
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
        <Field
          group
          label="Delivery speed"
          name="speed"
          required
          messages={{ valueMissing: 'Choose a speed.' }}
        >
          <SegmentedControl.Root>
            <SegmentedControl.Item value="standard">Standard</SegmentedControl.Item>
            <SegmentedControl.Item value="express">Express</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Field>
        <button type="submit">Save</button>
      </form>,
    );
    const form = container.querySelector('form');
    const group = container.querySelector<HTMLElement>('[role="radiogroup"]');
    if (form === null || group === null) throw new Error('no form');
    form.requestSubmit();
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe(
      'Choose a speed.',
    );
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.getAttribute('aria-describedby')).toBe(
      container.querySelector('[data-slot="field-error"]')?.id,
    );
    expect(document.activeElement).toBe(radios(container)[0]);
    // the Field label names the group
    expect(group.getAttribute('aria-labelledby')).toBe(container.querySelector('label')?.id);
    await userEvent.click(
      element(container.querySelectorAll('[data-slot="segmented-control-item"]')[1]),
    );
    await settle();
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    expect(group.hasAttribute('aria-invalid')).toBe(false);
    form.requestSubmit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('selecting never changes an item width, and the selection is drawn with a ring and weight', async () => {
    const container = await mount(
      <SegmentedControl.Root aria-label="Range" name="w" defaultValue="a">
        <SegmentedControl.Item value="a">Today</SegmentedControl.Item>
        <SegmentedControl.Item value="b">Wednesday</SegmentedControl.Item>
      </SegmentedControl.Root>,
    );
    const items = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="segmented-control-item"]'),
    ];
    const widths = (): number[] => items.map((item) => item.getBoundingClientRect().width);
    const before = widths();
    radios(container)[1]?.click();
    await settle(300);
    expect(widths()).toEqual(before);
    const selected = getComputedStyle(element(items[1]));
    expect(selected.boxShadow).toMatch(/inset/);
    const text = items[1]?.querySelector('.nz-segmented-control-text');
    expect(getComputedStyle(element(text)).fontWeight).toBe('600');
    expect(
      getComputedStyle(element(items[0]?.querySelector('.nz-segmented-control-text'))).fontWeight,
    ).not.toBe('600');
  });

  test('md is a 40 px track holding 32 px items, sm 32 and lg 48', async () => {
    const container = await mount(<SegmentedControlSizesExample />);
    const tracks = [...container.querySelectorAll<HTMLElement>('[role="radiogroup"]')];
    expect(tracks.map((track) => track.getBoundingClientRect().height)).toEqual([32, 48, 40]);
    const item = tracks[2]?.querySelector('[data-slot="segmented-control-item"]');
    expect(item?.getBoundingClientRect().height).toBe(32);
  });
});

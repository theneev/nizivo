// SearchField in Chromium (ARCHITECTURE.md §9.5, §16.1 D20; figma/06 §6.3): the server HTML hydrates
// unchanged; typing shows the clear button, which empties the field, keeps focus in it and reports
// the change; Escape clears a filled field and goes no further; the GET form submits the query;
// form.reset() and controlled values keep the clear button right; sizes, targets and the focus ring.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { SearchField } from '../../src/search-field/index';
import {
  SearchFieldExample,
  SearchFieldFieldExample,
  SearchFieldStatesExample,
  SearchFieldTopBarExample,
} from '../../src/search-field/search-field.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/search-field/search-field.css',
    '../../src/kbd/kbd.css',
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

function one(container: ParentNode, selector: string): HTMLElement {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
}

function input(container: ParentNode): HTMLInputElement {
  const found = one(container, 'input[type="search"]');
  if (!(found instanceof HTMLInputElement)) throw new Error('no input');
  return found;
}

function clear(container: ParentNode): HTMLButtonElement {
  const found = one(container, '[data-slot="search-field-clear"]');
  if (!(found instanceof HTMLButtonElement)) throw new Error('no clear button');
  return found;
}

function form(container: ParentNode): HTMLFormElement {
  const found = one(container, 'form');
  if (!(found instanceof HTMLFormElement)) throw new Error('no form');
  return found;
}

function Controlled(): JSX.Element {
  const [value, setValue] = useState('mug');
  return (
    <>
      <output>{value}</output>
      <SearchField
        aria-label="Search"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
    </>
  );
}

describe('SearchField', () => {
  test('every example hydrates with no mismatch and no console error', async () => {
    const { container, problems } = await hydrate(
      <div>
        <SearchFieldExample />
        <SearchFieldTopBarExample />
        <SearchFieldStatesExample />
        <SearchFieldFieldExample />
      </div>,
    );
    expect(problems).toEqual([]);
    // the native element: a search landmark, not an unknown element
    expect(one(container, 'search')).not.toBeInstanceOf(HTMLUnknownElement);
  });

  test('typing shows the clear button; pressing it empties the field, keeps focus and reports it', async () => {
    const onChange = vi.fn<(value: string) => void>();
    const container = await mount(
      <SearchField aria-label="Search" onChange={(event) => onChange(event.currentTarget.value)} />,
    );
    expect(clear(container).hidden).toBe(true);
    await userEvent.click(input(container));
    await userEvent.keyboard('mug');
    expect(clear(container).hidden).toBe(false);
    const box = clear(container).getBoundingClientRect();
    expect([box.width, box.height]).toEqual([24, 24]);
    await userEvent.click(clear(container));
    await settle();
    expect(input(container).value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(document.activeElement).toBe(input(container));
    expect(clear(container).hidden).toBe(true);
    // not a Tab stop: Escape clears from the keyboard
    expect(clear(container).tabIndex).toBe(-1);
  });

  test('Escape clears a filled field and stops there; on an empty field it passes on', async () => {
    const outer = vi.fn<(event: KeyboardEvent) => void>();
    const container = await mount(
      // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a listener probe, as a Dialog's
      <div onKeyDown={(event) => outer(event.nativeEvent)}>
        <SearchField aria-label="Search" defaultValue="mug" />
      </div>,
    );
    input(container).focus();
    await userEvent.keyboard('{Escape}');
    expect(input(container).value).toBe('');
    expect(outer).not.toHaveBeenCalled();
    await settle();
    expect(clear(container).hidden).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(outer).toHaveBeenCalledTimes(1);
  });

  test('in a GET form, Enter submits the query under its name', async () => {
    const submitted = vi.fn<(query: FormDataEntryValue | null) => void>();
    const container = await mount(
      <form
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          submitted(new FormData(event.currentTarget).get('q'));
        }}
      >
        <SearchField name="q" placeholder="Search orders" />
      </form>,
    );
    await userEvent.click(input(container));
    await userEvent.keyboard('stoneware{Enter}');
    expect(submitted).toHaveBeenCalledWith('stoneware');
  });

  test('form.reset() restores the default value, and the clear button follows it', async () => {
    const container = await mount(
      <form>
        <SearchField name="q" aria-label="Search" defaultValue="" />
      </form>,
    );
    await userEvent.click(input(container));
    await userEvent.keyboard('mug');
    expect(clear(container).hidden).toBe(false);
    form(container).reset();
    await settle();
    expect(input(container).value).toBe('');
    expect(clear(container).hidden).toBe(true);
  });

  test('controlled: the parent owns the value; clear reaches it through onChange', async () => {
    const container = await mount(<Controlled />);
    expect(clear(container).hidden).toBe(false);
    await userEvent.click(clear(container));
    await settle();
    expect(one(container, 'output').textContent).toBe('');
    expect(input(container).value).toBe('');
    expect(clear(container).hidden).toBe(true);
  });

  test('a press on the box focuses the input; Tab draws the ring on the box', async () => {
    const container = await mount(
      <>
        <button type="button">before</button>
        <SearchField aria-label="Search" shortcut="mod+k" />
      </>,
    );
    const root = one(container, '[data-slot="search-field"]');
    await userEvent.click(one(container, '[data-slot="search-field-icon"]'));
    expect(document.activeElement).toBe(input(container));
    one(container, 'button').focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(input(container));
    expect(getComputedStyle(root).outlineStyle).toBe('solid');
    expect(getComputedStyle(input(container)).outlineStyle).toBe('none');
  });

  test('md is 40 px, sm 32 and lg 48; the shortcut hint fits inside', async () => {
    const container = await mount(<SearchFieldStatesExample />);
    const boxes = [...container.querySelectorAll<HTMLElement>('[data-slot="search-field"]')];
    expect(boxes.slice(0, 3).map((box) => box.getBoundingClientRect().height)).toEqual([
      32, 40, 48,
    ]);
    const bar = await mount(<SearchFieldTopBarExample />);
    const field = one(bar, '[data-slot="search-field"]').getBoundingClientRect();
    const hint = one(bar, '.nz-kbd').getBoundingClientRect();
    expect(field.height).toBe(40);
    expect(hint.bottom).toBeLessThanOrEqual(field.bottom);
    expect(hint.top).toBeGreaterThanOrEqual(field.top);
  });

  test('required in a Field: submit shows the message inline and focuses the input', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Order number" required messages={{ valueMissing: 'Enter an order number.' }}>
          <SearchField name="order" />
        </Field>
      </form>,
    );
    form(container).requestSubmit();
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(one(container, '[data-slot="field-error"]').textContent).toBe('Enter an order number.');
    expect(input(container).getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input(container));
    expect(one(container, '[data-slot="search-field"]').hasAttribute('data-invalid')).toBe(true);
  });
});

// Combobox against the react-aria family's overlay conformance (ARCHITECTURE.md §12.3, §16.1), and
// its own behaviour: filtering as the reader types, the input keeping focus while the arrow keys move
// the active option, choosing, Escape, custom values, the Trigger and forms. The conformance subject
// opens on focus (menuTrigger="focus"), because the input is both its keyboard and its pointer
// trigger; the default opens as the reader types.
import type { ReactElement } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Combobox } from '../../src/combobox/index';
import { Field } from '../../src/field/field';
import { describeOverlay } from './conformance';
import { find, get, mount, settle, until } from './harness';

function comboboxAria(trigger: HTMLElement, popup: HTMLElement): void {
  const list = get('combobox-list', popup);
  expect(list.getAttribute('role')).toBe('listbox');
  expect(trigger.getAttribute('role')).toBe('combobox');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe(list.id);
  expect(trigger.getAttribute('aria-autocomplete')).toBe('list');
  expect(popup.querySelectorAll('[role="option"]')).toHaveLength(3);
}

const PERIODS = (
  <>
    <Combobox.Item value="7d">Last 7 days</Combobox.Item>
    <Combobox.Item value="30d">Last 30 days</Combobox.Item>
    <Combobox.Item value="90d">Last 90 days</Combobox.Item>
  </>
);

describeOverlay({
  name: 'Combobox',
  app: ({ defaultOpen, container } = {}) => (
    <Combobox.Root
      aria-label="Period"
      menuTrigger="focus"
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
    >
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Popup {...(container === undefined ? {} : { container })}>{PERIODS}</Combobox.Popup>
    </Combobox.Root>
  ),
  trigger: 'combobox-input',
  popup: 'combobox-popup',
  ring: 'combobox-control',
  pointer: 'press',
  keys: 'focus',
  focus: 'trigger',
  outsidePress: true,
  scrollLock: false,
  scales: true,
  aria: comboboxAria,
});

const COUNTRIES = (
  <>
    <Combobox.Item value="at">Austria</Combobox.Item>
    <Combobox.Item value="be">Belgium</Combobox.Item>
    <Combobox.Item value="de">Germany</Combobox.Item>
    <Combobox.Item value="dk">Denmark</Combobox.Item>
  </>
);

function country(props: Partial<Parameters<typeof Combobox.Root>[0]> = {}): ReactElement {
  return (
    <Combobox.Root aria-label="Country" {...props}>
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Popup>{COUNTRIES}</Combobox.Popup>
    </Combobox.Root>
  );
}

/** The combobox's input, narrowed. */
function textInput(): HTMLInputElement {
  const input = get('combobox-input');
  if (!(input instanceof HTMLInputElement)) throw new Error('no combobox input');
  return input;
}

const options = (): string[] =>
  [...document.querySelectorAll('[data-slot="combobox-item"]')].map((o) => o.textContent ?? '');

describe('Combobox behaviour', () => {
  test('typing opens it with the items that contain the text, in any case', async () => {
    await mount(country());
    const input = get('combobox-input');
    await userEvent.type(input, 'MA');
    await until(() => expect(find('combobox-popup')).not.toBeNull());
    expect(options()).toEqual(['Germany', 'Denmark']);
    expect(document.activeElement).toBe(input);
  });

  test('the arrow keys move the active option while the input keeps focus; Enter chooses it', async () => {
    const onValueChange = vi.fn<(value: string | null) => void>();
    await mount(country({ onValueChange }));
    const input = get('combobox-input');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await until(() => expect(find('combobox-popup')).not.toBeNull());
    await until(() => expect(input.getAttribute('aria-activedescendant')).toBeTruthy());
    await userEvent.keyboard('{ArrowDown}');
    const active = document.getElementById(input.getAttribute('aria-activedescendant') ?? '');
    expect(active?.textContent).toBe('Belgium');
    expect(active?.hasAttribute('data-highlighted')).toBe(true);
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard('{Enter}');
    await until(() => expect(find('combobox-popup')).toBeNull());
    expect(textInput().value).toBe('Belgium');
    expect(onValueChange).toHaveBeenLastCalledWith('be', expect.anything());
  });

  test('the Trigger opens every item, stays out of the tab order, and focus stays in the input', async () => {
    await mount(
      <>
        {country({ defaultValue: 'de' })}
        <button type="button">after</button>
      </>,
    );
    const trigger = get('combobox-trigger');
    expect(trigger.tabIndex).toBe(-1);
    expect(trigger.getAttribute('aria-label')).toBe('Show suggestions');
    await userEvent.click(trigger);
    await until(() => expect(find('combobox-popup')).not.toBeNull());
    expect(options()).toHaveLength(4);
    expect(trigger.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(get('combobox-input'));
    // Tab leaves for the next control and closes the list
    await userEvent.keyboard('{Tab}');
    await until(() => expect(find('combobox-popup')).toBeNull());
    expect(document.activeElement?.textContent).toBe('after');
  });

  test('Escape closes the list and puts back the chosen item’s text; with allowsCustomValue it keeps the typed text', async () => {
    await mount(country({ defaultValue: 'at' }));
    const input = textInput();
    await userEvent.click(input);
    await userEvent.keyboard('{End}{Backspace}{Backspace}');
    await until(() => expect(find('combobox-popup')).not.toBeNull());
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('combobox-popup')).toBeNull());
    expect(input.value).toBe('Austria');

    document.body.replaceChildren();
    await mount(country({ allowsCustomValue: true }));
    const custom = textInput();
    await userEvent.type(custom, 'de');
    await until(() => expect(find('combobox-popup')).not.toBeNull());
    await userEvent.keyboard('{Escape}');
    await until(() => expect(find('combobox-popup')).toBeNull());
    expect(custom.value).toBe('de');
  });

  test('without allowsCustomValue, a blur puts back the chosen item’s text', async () => {
    await mount(
      <>
        {country({ defaultValue: 'at' })}
        <button type="button">after</button>
      </>,
    );
    const input = textInput();
    // typed after the chosen text: clearing the input first would clear the choice too
    await userEvent.type(input, 'zz');
    expect(input.value).toBe('Austriazz');
    await userEvent.click(document.querySelector('button:not([data-slot])') ?? input);
    await settle();
    expect(input.value).toBe('Austria');
  });

  test('a form gets the chosen value; with allowsCustomValue, the typed text', async () => {
    const container = await mount(
      <form>
        <Field name="country" label="Country">
          <Combobox.Root defaultValue="dk">
            <Combobox.Input />
            <Combobox.Popup>{COUNTRIES}</Combobox.Popup>
          </Combobox.Root>
        </Field>
        <Field name="q" label="Search">
          <Combobox.Root allowsCustomValue>
            <Combobox.Input />
            <Combobox.Popup>{COUNTRIES}</Combobox.Popup>
          </Combobox.Root>
        </Field>
      </form>,
    );
    const inputs = [
      ...container.querySelectorAll<HTMLInputElement>('[data-slot="combobox-input"]'),
    ];
    const search = inputs[1];
    if (search === undefined) throw new Error('no second combobox');
    await userEvent.type(search, 'blue glaze');
    search.blur();
    await settle();
    const data = new FormData(container.querySelector('form') ?? undefined);
    expect(data.get('country')).toBe('dk');
    expect(data.get('q')).toBe('blue glaze');
  });

  test('inside a Field: the label names the input, and a required empty value shows the message', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field
          name="country"
          label="Country"
          required
          messages={{ valueMissing: 'Choose a country.' }}
        >
          <Combobox.Root>
            <Combobox.Input />
            <Combobox.Trigger />
            <Combobox.Popup>{COUNTRIES}</Combobox.Popup>
          </Combobox.Root>
        </Field>
        <button type="submit">Pay</button>
      </form>,
    );
    const input = get('combobox-input');
    const label = container.querySelector('label');
    expect(label?.htmlFor).toBe(input.id);
    await userEvent.click(container.querySelector('button[type="submit"]') ?? input);
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain(
      'Choose a country.',
    );
  });
});

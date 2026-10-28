// Select inside a Field (ARCHITECTURE.md §10.3, §16.1; src/field/FIELD-CONTRACT.md) and the
// select.css pass (figma/13 §4.3): the trigger is named by the value plus the Field label, a label
// click focuses the trigger and never opens the listbox, the Field's descriptions, flags and name
// reach the trigger and the hidden native <select>, the trigger matches NativeSelect in every state,
// and the popup follows Figma's Select Menu, Option, Group Label and Divider (figma/14 §4, M36).
import type { JSX } from 'react';
import { describe, expect, test } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { Input } from '../../src/input/input.client';
import { NativeSelect } from '../../src/native-select/native-select';
import { Select } from '../../src/select/index';
import { find, get, hydrate, mount, settle, until } from './harness';

// The harness loads tokens, base and select.css; the Field anatomy and the controls compared here.
const EXTRA = import.meta.glob(
  [
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/input/input.css',
    '../../src/native-select/native-select.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(EXTRA).length !== 4) throw new Error('a stylesheet is missing');
const extra = document.createElement('style');
extra.textContent = Object.values(EXTRA).join('\n');
document.head.append(extra);

const isChromium = server.browser === 'chromium';

function Period(props: Partial<Parameters<typeof Select.Root>[0]>): JSX.Element {
  return (
    <Select.Root defaultValue="30d" {...props}>
      <Select.Trigger />
      <Select.Popup>
        <Select.Item value="7d">Last 7 days</Select.Item>
        <Select.Item value="30d">Last 30 days</Select.Item>
        <Select.Item value="90d">Last 90 days</Select.Item>
      </Select.Popup>
    </Select.Root>
  );
}

/**
 * The hidden form control that carries the name and value: a native <select> with React Aria, an
 * <input> with Base UI (the canary). The contract asks for a hidden control, not its element (M74).
 */
function hiddenControl(root: ParentNode = document): HTMLSelectElement | HTMLInputElement {
  const control = root.querySelector('[data-slot="select"] select, [data-slot="select"] input');
  if (!(control instanceof HTMLSelectElement || control instanceof HTMLInputElement)) {
    throw new Error('no hidden form control');
  }
  return control;
}

function label(): HTMLLabelElement {
  const element = get('field-label');
  if (!(element instanceof HTMLLabelElement)) throw new Error('the Field label is not a <label>');
  return element;
}

/** The ids an element's ARIA references name that are not on the page. */
function missingIds(element: Element): string[] {
  return ['aria-labelledby', 'aria-describedby', 'aria-controls'].flatMap((attribute) =>
    (element.getAttribute(attribute) ?? '')
      .split(' ')
      .filter((id) => id !== '' && document.getElementById(id) === null)
      .map((id) => `${attribute}: ${id}`),
  );
}

/** The box of a trigger: what must match NativeSelect. */
function edge(element: Element): Record<string, string> {
  const css = getComputedStyle(element);
  return {
    border: css.borderTopColor,
    radius: css.borderTopLeftRadius,
    background: css.backgroundColor,
    color: css.color,
    boxSizing: css.boxSizing,
  };
}

/** A grouped Select opened from the keyboard; returns its rows. */
async function open(): Promise<HTMLElement[]> {
  await mount(
    <Select.Root aria-label="Period" defaultValue="30d">
      <Select.Trigger />
      <Select.Popup>
        <Select.Group>
          <Select.GroupLabel>Recent</Select.GroupLabel>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
        </Select.Group>
        <Select.Separator />
        <Select.Item value="all" disabled>
          All time
        </Select.Item>
      </Select.Popup>
    </Select.Root>,
  );
  get('select-trigger').focus();
  await userEvent.keyboard('{ArrowDown}');
  await until(() => expect(find('select-popup')).not.toBeNull());
  return [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
}

function indicator(item: Element): Element {
  const found = item.querySelector(':scope > .nz-select-item-indicator');
  if (found === null) throw new Error('no indicator');
  return found;
}

describe('Select in a Field', () => {
  test('the trigger is named by its value and the Field label, and described by the description and error', async () => {
    await mount(
      <Field label="Period" description="Shown on the report" error="Choose a shorter period">
        <Period />
      </Field>,
    );
    const trigger = get('select-trigger');
    // the label's `for` points at the trigger
    expect(label().control).toBe(trigger);
    const labelledBy = (trigger.getAttribute('aria-labelledby') ?? '').split(' ');
    // a button trigger (React Aria) is named by its value too; a combobox (Base UI, the canary)
    // carries its value as the combobox's own value (M74)
    expect(
      trigger.getAttribute('role') === 'combobox' || labelledBy.includes(get('select-value').id),
    ).toBe(true);
    expect(labelledBy).toContain(label().id);
    expect(trigger.getAttribute('aria-describedby')).toBe(
      `${get('field-description').id} ${get('field-error').id}`,
    );
    expect(trigger.hasAttribute('data-invalid')).toBe(true);
    expect(get('select').hasAttribute('data-invalid')).toBe(true);
  });

  test("the trigger's own aria-describedby is joined after the Field's ids, and its own id wins", async () => {
    await mount(
      <>
        <p id="hint">Hint</p>
        <Field label="Period" description="Shown on the report">
          <Select.Root defaultValue="7d">
            <Select.Trigger id="own" aria-describedby="hint" />
            <Select.Popup>
              <Select.Item value="7d">Last 7 days</Select.Item>
            </Select.Popup>
          </Select.Root>
        </Field>
      </>,
    );
    const trigger = get('select-trigger');
    expect(trigger.id).toBe('own');
    expect(trigger.getAttribute('aria-describedby')).toBe(`${get('field-description').id} hint`);
  });

  // React Aria's trigger names its own description and error slots, and itself by the id it made,
  // which a Field's id replaces: every id the trigger and the open listbox name must be on the page.
  const ID_CASES: [string, JSX.Element][] = [
    ['no Field', <Period key="a" aria-label="Period" />],
    [
      'no Field, its own id',
      <Select.Root key="b" aria-label="Period" defaultValue="7d">
        <Select.Trigger id="own" />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
        </Select.Popup>
      </Select.Root>,
    ],
    [
      'a Field with no description',
      <Field key="c" label="Period">
        <Period />
      </Field>,
    ],
    [
      'a Field and an aria-label',
      <Field key="d" label="Period" description="Shown on the report">
        <Period aria-label="Time range" />
      </Field>,
    ],
  ];

  for (const [name, app] of ID_CASES) {
    test(`every id the trigger and its listbox name is on the page: ${name}`, async () => {
      await mount(app);
      const trigger = get('select-trigger');
      expect(missingIds(trigger)).toEqual([]);
      trigger.focus();
      await userEvent.keyboard('{ArrowDown}');
      await until(() => expect(find('select-popup')).not.toBeNull());
      const listbox = document.querySelector('[role="listbox"]');
      if (listbox === null) throw new Error('no listbox');
      expect([...missingIds(trigger), ...missingIds(listbox)]).toEqual([]);
      await userEvent.keyboard('{Escape}');
      await until(() => expect(find('select-popup')).toBeNull());
    });
  }

  test('a label click focuses the trigger with its ring and never opens the listbox', async () => {
    await mount(
      <Field label="Period">
        <Period />
      </Field>,
    );
    const trigger = get('select-trigger');
    await userEvent.click(label());
    await settle();
    expect(document.activeElement).toBe(trigger);
    expect(find('select-popup')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).not.toBe('true');
    // the user sees where focus went (React Aria's own Select label does the same)
    expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
    // the keyboard still opens it from there
    await userEvent.keyboard('{ArrowDown}');
    await until(() => expect(find('select-popup')).not.toBeNull());
  });

  test('server HTML hydrates with no warning, then a label click focuses the trigger', async () => {
    const { html, problems } = await hydrate(
      <Field label="Period" description="Shown on the report">
        <Period />
      </Field>,
    );
    expect(problems).toEqual([]);
    // the label's click handler is client-only: the server HTML carries the plain `for`
    expect(html).toMatch(/<label class="nz-field-label"[^>]*for="[^"]+"/);
    await userEvent.click(label());
    await settle();
    expect(document.activeElement).toBe(get('select-trigger'));
    expect(find('select-popup')).toBeNull();
  });

  test('a label click leaves a disabled trigger alone', async () => {
    await mount(
      <Field label="Period" disabled>
        <Period />
      </Field>,
    );
    await userEvent.click(label(), { force: true });
    await settle();
    expect(document.activeElement).toBe(document.body);
    expect(find('select-popup')).toBeNull();
  });

  test('other controls keep the native label behaviour', async () => {
    await mount(
      <Field label="Title">
        <Input />
      </Field>,
    );
    await userEvent.click(label());
    expect(document.activeElement).toBe(get('input').querySelector('input'));
  });

  test('required, disabled and name flow from the Field to the trigger and the hidden select; own props win', async () => {
    await mount(
      <>
        <Field label="Period" name="period" required disabled>
          <Period />
        </Field>
        <Field label="Range" name="range" required disabled>
          <Period name="own" required={false} disabled={false} />
        </Field>
      </>,
    );
    const [first, second] = [...document.querySelectorAll<HTMLElement>('[data-slot="field"]')];
    if (first === undefined || second === undefined) throw new Error('no fields');
    const native = hiddenControl(first);
    expect(native.name).toBe('period');
    expect(native.required).toBe(true);
    expect(native.disabled).toBe(true);
    const trigger = get('select-trigger', first);
    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(trigger.hasAttribute('data-disabled')).toBe(true);
    const own = hiddenControl(second);
    expect(own.name).toBe('own');
    expect(own.required).toBe(false);
    expect(own.disabled).toBe(false);
    expect(get('select-trigger', second).hasAttribute('disabled')).toBe(false);
  });

  test("the value reaches FormData under the Field's name", async () => {
    const container = await mount(
      <form>
        <Field label="Period" name="period">
          <Period />
        </Field>
      </form>,
    );
    const form = container.querySelector('form');
    if (form === null) throw new Error('no form');
    expect(new FormData(form).get('period')).toBe('30d');
    await userEvent.click(get('select-trigger'));
    await until(() => expect(find('select-popup')).not.toBeNull());
    const [first] = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    if (first === undefined) throw new Error('no items');
    await userEvent.click(first);
    await until(() => expect(new FormData(form).get('period')).toBe('7d'));
  });

  // React Aria 1.22.1 resets the state on the form's `reset`, then the browser resets the hidden
  // <select> to its empty first option and nothing writes the value back (review R1-1).
  test('a form reset puts the default value back in the trigger and in FormData; a required form then submits', async () => {
    let submitted = 0;
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted += 1;
        }}
      >
        <Field label="Period" name="period" required>
          <Period />
        </Field>
        <button type="reset">Reset</button>
        <button type="submit">Save</button>
      </form>,
    );
    const form = container.querySelector('form');
    if (form === null) throw new Error('no form');
    await userEvent.click(get('select-trigger'));
    await until(() => expect(find('select-popup')).not.toBeNull());
    const [first] = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    if (first === undefined) throw new Error('no items');
    await userEvent.click(first);
    await until(() => expect(new FormData(form).get('period')).toBe('7d'));
    await userEvent.click(container.querySelector('button[type="reset"]') ?? document.body);
    await until(() => expect(get('select-trigger').textContent).toContain('Last 30 days'));
    await until(() => expect(new FormData(form).get('period')).toBe('30d'));
    expect(hiddenControl().value).toBe('30d');
    await userEvent.click(container.querySelector('button[type="submit"]') ?? document.body);
    await until(() => expect(submitted).toBe(1));
  });

  test('a required, empty Select blocks the submit and takes focus', async () => {
    let submitted = false;
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = true;
        }}
      >
        <Field label="Period" name="period" required>
          <Select.Root placeholder="Choose a period">
            <Select.Trigger />
            <Select.Popup>
              <Select.Item value="7d">Last 7 days</Select.Item>
            </Select.Popup>
          </Select.Root>
        </Field>
        <button type="submit">Save</button>
      </form>,
    );
    await userEvent.click(container.querySelector('button[type="submit"]') ?? document.body);
    await settle();
    expect(submitted).toBe(false);
    expect(hiddenControl().validity.valueMissing).toBe(true);
    expect(document.activeElement).toBe(get('select-trigger'));
  });
});

describe('select.css: the trigger matches NativeSelect', () => {
  test.each([
    ['rest', {}],
    ['sm', { size: 'sm' }],
    ['lg', { size: 'lg' }],
    ['invalid', { invalid: true }],
    ['disabled', { disabled: true }],
  ] as const)('%s', async (_state, props) => {
    await mount(
      <>
        <div data-testid="away" style={{ blockSize: 64 }} />
        <Period aria-label="Period" {...props} />
        <NativeSelect aria-label="Period" defaultValue="30d" {...props}>
          <option value="30d">Last 30 days</option>
        </NativeSelect>
      </>,
    );
    // no hover on either, and every border transition finished
    await userEvent.hover(document.querySelector('[data-testid="away"]') ?? document.body);
    await settle(300);
    // the select's own colour is its value text, which the placeholder rule may change; compare the box
    const trigger = edge(get('select-trigger'));
    const native = edge(get('native-select-trigger'));
    expect(trigger).toEqual(native);
  });

  test('a disabled Fieldset disables the trigger natively and it looks disabled', async () => {
    await mount(
      <>
        <fieldset disabled>
          <Period aria-label="Period" />
        </fieldset>
        <Period aria-label="Period" disabled />
      </>,
    );
    const [inFieldset, flagged] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="select-trigger"]'),
    ];
    if (inFieldset === undefined || flagged === undefined) throw new Error('no triggers');
    expect(edge(inFieldset)).toEqual(edge(flagged));
  });
});

/** Where an element's first text starts, in viewport px. */
function textStart(element: Element): number {
  const text = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (text === undefined) throw new Error('no text');
  const range = document.createRange();
  range.selectNodeContents(text);
  return range.getBoundingClientRect().left;
}

/** What a box-shadow value computes to here, read from a probe element. */
function shadow(value: string): string {
  const probe = document.createElement('div');
  probe.style.boxShadow = value;
  document.body.append(probe);
  const out = getComputedStyle(probe).boxShadow;
  probe.remove();
  return out;
}

describe("select.css: the popup follows Figma's Select Menu and Select Option (M36)", () => {
  test('the selected row keeps the tint, is Label/M Strong in the row colour, with a trailing check', async () => {
    const [recent, selected] = await open();
    if (recent === undefined || selected === undefined) throw new Error('no items');
    await until(() => expect(selected.hasAttribute('data-focus-visible')).toBe(true));
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(getComputedStyle(indicator(selected)).visibility).toBe('visible');
    expect(getComputedStyle(indicator(recent)).visibility).toBe('hidden');
    expect(indicator(selected).getAttribute('aria-hidden')).toBe('true');
    // the check is not part of the option's name or of the trigger's value
    expect(selected.textContent).toBe('Last 30 days');
    expect(get('select-value').querySelector('svg')).toBeNull();
    // the keyboard ring is inside the row
    const row = getComputedStyle(selected);
    const plain = getComputedStyle(recent);
    expect(row.outlineStyle).toBe('solid');
    expect(row.outlineOffset).toBe('-2px');
    // Label/M (14 px, 500) and Label/M Strong (600) in text/primary; the tint stays (M36 #2)
    expect(plain.fontSize).toBe('14px');
    expect(row.fontSize).toBe('14px');
    expect(plain.fontWeight).toBe('500');
    expect(row.fontWeight).toBe('600');
    expect(row.color).toBe(plain.color);
    expect(row.backgroundColor).not.toBe(plain.backgroundColor);
    // 8 / 12 px padding, 36 px rows that touch (layout boxes: the popup may still be scaling in)
    expect(row.paddingTop).toBe('8px');
    expect(row.paddingInlineStart).toBe('12px');
    expect(selected.offsetHeight).toBe(36);
    expect(selected.offsetTop - recent.offsetTop - recent.offsetHeight).toBe(0);
    // the check's column is reserved on every row, so selection never moves the text
    const column = indicator(recent);
    if (!(column instanceof HTMLElement)) throw new Error('the indicator is not an element');
    expect(column.offsetWidth).toBe(16);
    expect(textStart(selected)).toBe(textStart(recent));
  });

  test('group label is Label/S in text/secondary, 8 / 12 / 4 / 12; the divider has 4 px above and below', async () => {
    const [recent] = await open();
    if (recent === undefined) throw new Error('no items');
    const group = getComputedStyle(get('select-group-label'));
    expect(group.fontSize).toBe('12px');
    expect(group.color).not.toBe(getComputedStyle(recent).color);
    expect([group.paddingTop, group.paddingRight, group.paddingBottom, group.paddingLeft]).toEqual([
      '8px',
      '12px',
      '4px',
      '12px',
    ]);
    const separator = getComputedStyle(get('select-separator'));
    expect(separator.blockSize).toBe('1px');
    expect([separator.marginTop, separator.marginBottom]).toEqual(['4px', '4px']);
  });

  test('the popup is radius/md and Elevation/4, opens 4 px below the trigger, at least its width', async () => {
    await open();
    const popup = get('select-popup');
    const trigger = get('select-trigger');
    const css = getComputedStyle(popup);
    expect(css.borderTopStyle).toBe('solid');
    expect(css.borderTopWidth).toBe('1px');
    expect(css.borderTopLeftRadius).toBe('12px');
    expect(css.paddingTop).toBe('0px');
    expect(getComputedStyle(get('select-list')).paddingTop).toBe('6px');
    expect(css.boxShadow).toBe(shadow('var(--nz-elevation-4)'));
    // layout box, not the scaled one: the popup's top edge is 4 px under the trigger's bottom
    await until(() => expect(popup.hasAttribute('data-entering')).toBe(false));
    await settle(300);
    const gap = popup.getBoundingClientRect().top - trigger.getBoundingClientRect().bottom;
    expect(Math.round(gap)).toBe(4);
    expect(popup.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      Math.floor(trigger.getBoundingClientRect().width),
    );
  });

  test.runIf(isChromium)(
    'forced colours: the selected row stays Highlight under the pointer, with a system-colour check',
    async () => {
      const session = cdp();
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'forced-colors', value: 'active' }],
      });
      try {
        const [recent, selected] = await open();
        if (recent === undefined || selected === undefined) throw new Error('no items');
        const resting = getComputedStyle(selected).backgroundColor;
        await userEvent.hover(selected);
        await until(() => expect(selected.hasAttribute('data-highlighted')).toBe(true));
        const row = getComputedStyle(selected);
        expect(row.backgroundColor).toBe(resting);
        expect(getComputedStyle(indicator(selected)).color).toBe(row.color);
        expect(row.backgroundColor).not.toBe(getComputedStyle(recent).backgroundColor);
        // The keyboard ring is inset, one ring width inside the Highlight fill: HighlightText.
        await userEvent.keyboard('{ArrowUp}{ArrowDown}');
        await until(() => expect(selected.hasAttribute('data-focus-visible')).toBe(true));
        const focused = getComputedStyle(selected);
        expect(focused.outlineStyle).toBe('solid');
        expect(focused.outlineOffset).toBe('-4px');
        expect(focused.outlineColor).toBe(focused.color);
        expect(focused.outlineColor).not.toBe(focused.backgroundColor);
      } finally {
        await session.send('Emulation.setEmulatedMedia', { features: [] });
      }
    },
  );
});

// Checkbox, Switch and RadioGroup in Chromium: server HTML hydrates with no mismatch; the native
// inputs carry the state (indeterminate, FormData, arrow keys, a disabled fieldset); Field's native
// validation reaches a checkbox; the switch thumb travels with the direction.
import { useState, type JSX, type ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Checkbox } from '../../src/checkbox/index';
import { Field } from '../../src/field/field';
import { Radio, RadioGroup } from '../../src/radio-group/index';
import { Switch } from '../../src/switch/index';

// The shipped stylesheets, for the geometry checks.
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/fieldset/fieldset.css',
    '../../src/checkbox/checkbox.css',
    '../../src/switch/switch.css',
    '../../src/radio-group/radio-group.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 7)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  vi.restoreAllMocks();
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
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { container, html, problems };
}

function input(container: HTMLElement, selector: string): HTMLInputElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLInputElement)) throw new Error(`no input ${selector}`);
  return element;
}

function rect(element: Element | null): DOMRect {
  if (element === null) throw new Error('missing element');
  return element.getBoundingClientRect();
}

const onCheckedChange = vi.fn<(checked: boolean) => void>();
const onValueChange = vi.fn<(value: string) => void>();

function Form({ onSubmit }: { onSubmit?: (data: FormData) => void }): JSX.Element {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(new FormData(event.currentTarget));
      }}
    >
      <Checkbox name="track" defaultChecked>
        Track inventory
      </Checkbox>
      <Checkbox
        name="all"
        defaultChecked="indeterminate"
        onCheckedChange={(checked) => onCheckedChange(checked)}
      >
        All variants
      </Checkbox>
      <Switch name="online" value="yes" defaultChecked>
        Online store
      </Switch>
      <Switch name="wholesale">Wholesale</Switch>
      <RadioGroup
        legend="Shipping"
        name="shipping"
        defaultValue="standard"
        onValueChange={(value) => onValueChange(value)}
      >
        <Radio value="standard">Standard</Radio>
        <Radio value="express">Express</Radio>
        <Radio value="pickup">Pickup</Radio>
      </RadioGroup>
      <button type="submit">Save</button>
    </form>
  );
}

function ControlledCheckbox(): JSX.Element {
  const [checked, setChecked] = useState<boolean | 'indeterminate'>('indeterminate');
  return (
    <>
      <Checkbox name="ignored" checked="indeterminate" onCheckedChange={() => {}}>
        Ignored
      </Checkbox>
      <Checkbox name="owned" checked={checked} onCheckedChange={setChecked}>
        Owned
      </Checkbox>
    </>
  );
}

function ControlledGroup(): JSX.Element {
  const [value, setValue] = useState<string | null>(null);
  return (
    <RadioGroup legend="Unit" name="unit" value={value} onValueChange={setValue}>
      <Radio value="kg">kg</Radio>
      <Radio value="lb">lb</Radio>
    </RadioGroup>
  );
}

/** Switches the document direction, hydrates a switch, turns it on and measures the thumb. */
async function travel(dir: 'ltr' | 'rtl'): Promise<number[]> {
  document.documentElement.setAttribute('dir', dir);
  const { container } = await hydrate(<Switch name="s">Online store</Switch>);
  const track = container.querySelector('.nz-switch-input');
  const thumb = container.querySelector('.nz-switch-thumb');
  const start = rect(thumb).left - rect(track).left;
  await userEvent.click(input(container, 'input'));
  // the thumb travels on the spring pair; wait for it to settle
  let end = Number.NaN;
  await vi.waitFor(
    () => {
      end = rect(thumb).left - rect(track).left;
      expect(Math.abs(end - start)).toBe(16);
    },
    { timeout: 2000 },
  );
  return [start, end];
}

describe('SSR then hydration', () => {
  test('every control hydrates with no mismatch and leaves the DOM unchanged', async () => {
    const { container, html, problems } = await hydrate(<Form />);
    expect(problems).toEqual([]);
    const parsed = document.createElement('div');
    parsed.innerHTML = html;
    expect(container.innerHTML).toBe(parsed.innerHTML);
  });

  test('the form submits what the native inputs hold', async () => {
    const submitted = vi.fn<(data: FormData) => void>();
    const { container } = await hydrate(<Form onSubmit={submitted} />);
    container.querySelector('form')?.requestSubmit();
    const data = submitted.mock.calls[0]?.[0];
    // a mixed box submits as unchecked; a switch submits its value while on
    expect([...(data?.entries() ?? [])]).toEqual([
      ['track', 'on'],
      ['online', 'yes'],
      ['shipping', 'standard'],
    ]);
  });
});

describe('Checkbox', () => {
  test('defaultChecked="indeterminate": mixed after hydration, the dash shows, a click checks it', async () => {
    onCheckedChange.mockClear();
    const { container } = await hydrate(<Form />);
    const all = input(container, 'input[name="all"]');
    expect(all.indeterminate).toBe(true);
    const indicator = all.nextElementSibling;
    expect(getComputedStyle(indicator ?? all).visibility).toBe('visible');
    expect(getComputedStyle(indicator?.querySelector('.nz-glyph-minus') ?? all).display).not.toBe(
      'none',
    );
    expect(getComputedStyle(indicator?.querySelector('.nz-glyph-check') ?? all).display).toBe(
      'none',
    );
    await userEvent.click(all);
    expect(all.indeterminate).toBe(false);
    expect(all.checked).toBe(true);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // a re-render does not bring the uncontrolled mixed state back
    expect(all.matches(':indeterminate')).toBe(false);
  });

  test('controlled "indeterminate" stays mixed until its owner changes it', async () => {
    const { container, problems } = await hydrate(<ControlledCheckbox />);
    expect(problems).toEqual([]);
    const ignored = input(container, 'input[name="ignored"]');
    const owned = input(container, 'input[name="owned"]');
    expect([ignored.indeterminate, owned.indeterminate]).toEqual([true, true]);
    await userEvent.click(ignored);
    expect([ignored.indeterminate, ignored.checked]).toEqual([true, false]);
    await userEvent.click(owned);
    await vi.waitFor(() => expect([owned.indeterminate, owned.checked]).toEqual([false, true]));
  });

  test('geometry: a 20 px box, the label after it, the glyph centred in the box', async () => {
    const { container } = await hydrate(<Checkbox defaultChecked>Track inventory</Checkbox>);
    const box = rect(container.querySelector('.nz-checkbox-input'));
    expect([box.width, box.height]).toEqual([20, 20]);
    const glyph = rect(container.querySelector('.nz-glyph-check'));
    expect([glyph.width, glyph.height]).toEqual([14, 14]);
    expect(glyph.left - box.left).toBe(3);
    expect(glyph.top - box.top).toBe(3);
    const label = rect(container.querySelector('.nz-checkbox-label'));
    expect(label.left - box.right).toBe(8);
  });

  test('required inside a Field: submit shows the message on the box and focuses it; checking clears it', async () => {
    const submitted = vi.fn<() => void>();
    const { container } = await hydrate(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted();
        }}
      >
        <Field label="Terms" required messages={{ valueMissing: 'Accept the terms' }}>
          <Checkbox name="terms">I accept</Checkbox>
        </Field>
      </form>,
    );
    const terms = input(container, 'input[name="terms"]');
    container.querySelector('form')?.requestSubmit();
    await vi.waitFor(() => expect(terms.getAttribute('aria-invalid')).toBe('true'));
    expect(submitted).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(terms);
    expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe(
      'Accept the terms',
    );
    expect(terms.closest('[data-slot="checkbox"]')?.hasAttribute('data-invalid')).toBe(true);
    await userEvent.click(terms);
    await vi.waitFor(() => expect(terms.hasAttribute('aria-invalid')).toBe(false));
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
  });
});

describe('Switch', () => {
  test('geometry: a 36 × 20 track and a 16 px thumb inset by 2 px', async () => {
    const { container } = await hydrate(<Switch>Online store</Switch>);
    const track = rect(container.querySelector('.nz-switch-input'));
    const thumb = rect(container.querySelector('.nz-switch-thumb'));
    expect([track.width, track.height]).toEqual([36, 20]);
    expect([thumb.width, thumb.height]).toEqual([16, 16]);
    expect([thumb.left - track.left, thumb.top - track.top]).toEqual([2, 2]);
    expect(input(container, 'input').getAttribute('role')).toBe('switch');
  });

  test('the thumb travels 16 px toward the inline end, in either direction', async () => {
    expect(await travel('ltr')).toEqual([2, 18]);
    for (const root of roots.splice(0)) root.unmount();
    document.body.replaceChildren();
    expect(await travel('rtl')).toEqual([18, 2]);
  });
});

describe('RadioGroup', () => {
  test('arrow keys move the checked radio natively and report the new value', async () => {
    onValueChange.mockClear();
    const { container } = await hydrate(<Form />);
    const standard = input(container, 'input[value="standard"]');
    standard.focus();
    await userEvent.keyboard('{ArrowDown}');
    const express = input(container, 'input[value="express"]');
    expect(express.checked).toBe(true);
    expect(document.activeElement).toBe(express);
    expect(onValueChange).toHaveBeenLastCalledWith('express');
  });

  test('controlled: the group shows its value, a click reports the new one', async () => {
    const { container, problems } = await hydrate(<ControlledGroup />);
    expect(problems).toEqual([]);
    const lb = input(container, 'input[value="lb"]');
    expect(lb.checked).toBe(false);
    await userEvent.click(lb);
    await vi.waitFor(() => expect(lb.checked).toBe(true));
  });

  test('a disabled group disables every radio natively and dims each label', async () => {
    const { container } = await hydrate(
      <RadioGroup legend="Unit" name="unit" defaultValue="kg" disabled>
        <Radio value="kg">kg</Radio>
        <Radio value="lb">lb</Radio>
      </RadioGroup>,
    );
    const radios = [...container.querySelectorAll('input')];
    expect(radios.every((radio) => radio.matches(':disabled'))).toBe(true);
    expect(radios.some((radio) => radio.hasAttribute('disabled'))).toBe(false);
    const label = container.querySelector('.nz-radio');
    expect(getComputedStyle(label ?? document.body).cursor).toBe('not-allowed');
  });

  test('geometry: a 20 px circle with an 8 px dot when checked', async () => {
    const { container } = await hydrate(
      <RadioGroup legend="Unit" name="unit" defaultValue="kg">
        <Radio value="kg">kg</Radio>
      </RadioGroup>,
    );
    const radio = input(container, 'input');
    const box = rect(radio);
    expect([box.width, box.height]).toEqual([20, 20]);
    // ring = (20 - 2 × 1 border - 8 dot) / 2
    expect(getComputedStyle(radio).boxShadow).toMatch(/ 0px 0px 0px 5px inset$/);
  });
});

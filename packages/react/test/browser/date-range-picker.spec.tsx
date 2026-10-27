// DateRangePicker in a browser (ARCHITECTURE.md §16.3; D-dg): hydration with no mismatch, the trigger
// named by its value and the Field label, the popover opening on the trigger with the applied
// range's month, a preset and Apply, Cancel and Escape keeping the old range, picking two days with
// the keyboard, the today mark in the picker's time zone, and the form's ISO interval.
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { DateRangePicker } from '../../src/unstable/date-range-picker/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/field/field.css',
    '../../src/popover/popover.css',
    '../../src/select/select.css',
    '../../src/unstable/date-range-picker/date-range-picker.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 7)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const popup = (): HTMLElement | null => document.querySelector('.nz-date-range-picker-popup');

const roots: Root[] = [];
beforeEach(() => {
  // only Date: React's scheduling keeps its real timers. 8 Oct 2026, 23:30 in UTC, which is
  // already 9 Oct in Berlin
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-08T23:30:00Z'));
});
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 80));

/**
 * Waits for the popup to leave the page (it stays mounted through its exit transition), then for
 * React Aria to return focus, which it does just after.
 */
async function closed(): Promise<void> {
  // oxlint-disable-next-line no-await-in-loop -- polled one step at a time on purpose
  for (let i = 0; i < 40 && popup() !== null; i += 1) await settle();
  await settle();
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

function trigger(container: ParentNode): HTMLButtonElement {
  const el = container.querySelector('[data-slot="date-range-picker-trigger"]');
  if (!(el instanceof HTMLButtonElement)) throw new Error('no trigger');
  return el;
}

function button(name: string): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>('.nz-date-range-picker-popup button'),
  ].find((b) => b.textContent === name);
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
}

const hidden = (container: ParentNode): string =>
  container.querySelector<HTMLInputElement>('input[type="hidden"][name="period"]')?.value ?? '';

/** A day of the shown month that takes focus. */
const day = (n: string): HTMLElement => {
  const found = [
    ...document.querySelectorAll<HTMLElement>(
      '.nz-date-range-picker-day:not([data-outside-month]) [role="button"], .nz-date-range-picker-day:not([data-outside-month])',
    ),
  ].find((el) => el.textContent === n && el.tabIndex >= 0);
  if (found === undefined) throw new Error(`no day ${n}`);
  return found;
};
function picker(timeZone = 'UTC'): ReactNode {
  return (
    <Field label="Report period">
      <DateRangePicker
        name="period"
        timeZone={timeZone}
        defaultValue={{ start: '2026-10-01', end: '2026-10-07' }}
      />
    </Field>
  );
}

describe('server and hydration', () => {
  test('hydrates with no mismatch; the trigger reads the range and is named with the label', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(picker());
    document.body.append(container);
    const before = container.innerHTML;
    const problems: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
    roots.push(
      hydrateRoot(container, picker(), { onRecoverableError: (error) => problems.push(error) }),
    );
    await settle();
    expect(container.innerHTML).toBe(before);
    expect(problems).toEqual([]);
    const t = trigger(container);
    expect(t.textContent).toBe('Oct 1 – Oct 7, 2026');
    const names = (t.getAttribute('aria-labelledby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(names).toEqual(['Oct 1 – Oct 7, 2026', 'Report period']);
    expect(hidden(container)).toBe('2026-10-01/2026-10-07');
    expect(popup()).toBeNull();
  });
});

describe('the popover', () => {
  test('opens on the applied month with the range drawn; Cancel keeps it', async () => {
    const container = await mount(picker());
    await userEvent.click(trigger(container));
    await settle();
    expect(popup()).not.toBeNull();
    expect(document.querySelector('.nz-date-range-picker-heading')?.textContent).toBe(
      'October 2026',
    );
    const start = document.querySelector('[data-range-start]');
    const end = document.querySelector('[data-range-end]');
    expect(start?.textContent).toBe('1');
    expect(end?.textContent).toBe('7');
    expect(document.querySelectorAll('.nz-date-range-picker-day[data-selected]')).toHaveLength(7);
    // today in UTC is the 8th
    expect(document.querySelector('[data-today]')?.textContent).toBe('8');
    await userEvent.click(button('Last 30 days'));
    await userEvent.click(button('Cancel'));
    await closed();
    expect(popup()).toBeNull();
    expect(trigger(container).textContent).toBe('Oct 1 – Oct 7, 2026');
  });

  test('a preset, then Apply: the range, the trigger and the form change', async () => {
    const container = await mount(picker());
    await userEvent.click(trigger(container));
    await settle();
    await userEvent.click(button('Last 7 days'));
    expect(button('Last 7 days').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.nz-date-range-picker-range')?.textContent).toBe(
      'Oct 2 – Oct 8, 2026',
    );
    await userEvent.click(button('Apply'));
    await closed();
    expect(popup()).toBeNull();
    expect(trigger(container).textContent).toBe('Oct 2 – Oct 8, 2026');
    expect(hidden(container)).toBe('2026-10-02/2026-10-08');
    expect(document.activeElement).toBe(trigger(container));
  });

  test('"today" is counted in the time zone: the 9th in Berlin', async () => {
    const container = await mount(picker('Europe/Berlin'));
    await userEvent.click(trigger(container));
    await settle();
    expect(document.querySelector('[data-today]')?.textContent).toBe('9');
    await userEvent.click(button('Today'));
    expect(document.querySelector('.nz-date-range-picker-range')?.textContent).toBe(
      'Oct 9 – Oct 9, 2026',
    );
  });

  test('Escape keeps the old range and returns focus to the trigger', async () => {
    const container = await mount(picker());
    await userEvent.click(trigger(container));
    await settle();
    await userEvent.click(button('Year to date'));
    await userEvent.keyboard('{Escape}');
    await closed();
    expect(popup()).toBeNull();
    expect(trigger(container).textContent).toBe('Oct 1 – Oct 7, 2026');
    expect(document.activeElement).toBe(trigger(container));
  });

  test('two days by keyboard: Enter on the 14th (focus moves on to the 15th), then on the 16th', async () => {
    const container = await mount(picker());
    await userEvent.click(trigger(container));
    await settle();
    // the keyboard starts on the applied range's end, the 7th
    // the pointer off the grid: during a range pick React Aria follows a hovered day
    const heading = document.querySelector('.nz-date-range-picker-heading');
    if (heading === null) throw new Error('no heading');
    await userEvent.hover(heading);
    day('7').focus();
    // React Aria moves the keyboard on by a day after the first Enter, to show a range is under way
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(document.activeElement?.textContent).toBe('15');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(document.querySelector('.nz-date-range-picker-range')?.textContent).toBe(
      'Oct 14 – Oct 16, 2026',
    );
    await userEvent.click(button('Apply'));
    await settle();
    expect(hidden(container)).toBe('2026-10-14/2026-10-16');
  });

  test('with no range: the placeholder, and Apply is disabled until a range is picked', async () => {
    const container = await mount(<DateRangePicker aria-label="Window" timeZone="UTC" />);
    expect(trigger(container).textContent).toBe('Select dates');
    await userEvent.click(trigger(container));
    await settle();
    expect(button('Apply').disabled).toBe(true);
    expect(document.querySelector('.nz-date-range-picker-heading')?.textContent).toBe(
      'October 2026',
    );
  });
});

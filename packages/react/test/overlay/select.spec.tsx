// Select against the react-aria family's overlay conformance (ARCHITECTURE.md §10.3, §12.3 Select row).
import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Select } from '../../src/select/index';
import { describeOverlay } from './conformance';
import { find, get, mount, until } from './harness';

function selectAria(trigger: HTMLElement, popup: HTMLElement): void {
  const list = get('select-list', popup);
  expect(list.getAttribute('role')).toBe('listbox');
  expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(list.getAttribute('aria-labelledby')?.split(' ')).toContain(trigger.id);
  expect(popup.querySelectorAll('[role="option"]')).toHaveLength(3);
}

describeOverlay({
  name: 'Select',
  app: ({ defaultOpen, container } = {}) => (
    <Select.Root
      aria-label="Period"
      defaultValue="30d"
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
    >
      <Select.Trigger />
      <Select.Popup {...(container === undefined ? {} : { container })}>
        <Select.Item value="7d">Last 7 days</Select.Item>
        <Select.Item value="30d">Last 30 days</Select.Item>
        <Select.Item value="90d">Last 90 days</Select.Item>
      </Select.Popup>
    </Select.Root>
  ),
  trigger: 'select-trigger',
  popup: 'select-popup',
  pointer: 'press',
  keys: ['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'],
  focus: 'inside',
  outsidePress: true,
  scrollLock: true,
  scales: true,
  aria: selectAria,
});

describe('Select behaviour', () => {
  test('a listbox holds only options and groups: the separator is presentational (axe aria-required-children)', async () => {
    await mount(
      <Select.Root aria-label="Period" defaultValue="7d">
        <Select.Trigger />
        <Select.Popup>
          <Select.Group>
            <Select.GroupLabel>Recent</Select.GroupLabel>
            <Select.Item value="7d">Last 7 days</Select.Item>
          </Select.Group>
          <Select.Separator />
          <Select.Item value="all">All time</Select.Item>
        </Select.Popup>
      </Select.Root>,
    );
    await userEvent.click(get('select-trigger'));
    await until(() => expect(find('select-popup')).not.toBeNull());
    const list = get('select-list');
    const roles = [...list.children].map((child) => child.getAttribute('role'));
    expect(
      roles.filter((role) => role !== 'option' && role !== 'group' && role !== 'presentation'),
    ).toEqual([]);
    const separator = get('select-separator');
    expect(separator.getAttribute('role')).toBe('presentation');
    expect(separator.hasAttribute('aria-orientation')).toBe(false);
  });

  test('the pointer never draws the keyboard ring on an option', async () => {
    await mount(
      <Select.Root aria-label="Period" defaultValue="7d">
        <Select.Trigger />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
        </Select.Popup>
      </Select.Root>,
    );
    await userEvent.click(get('select-trigger'));
    await until(() => expect(find('select-popup')).not.toBeNull());
    const [first, second] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]'),
    ];
    if (first === undefined || second === undefined) throw new Error('no items');
    await until(() => expect(document.activeElement).toBe(first));
    expect(getComputedStyle(first).outlineStyle).toBe('none');
    await userEvent.hover(second);
    await until(() => expect(second.hasAttribute('data-highlighted')).toBe(true));
    expect(getComputedStyle(second).outlineStyle).toBe('none');
    await userEvent.keyboard('{ArrowUp}');
    await until(() => expect(first.hasAttribute('data-focus-visible')).toBe(true));
    expect(getComputedStyle(first).outlineStyle).toBe('solid');
  });
});

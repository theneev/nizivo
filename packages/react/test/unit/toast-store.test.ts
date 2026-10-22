// The toast queue (src/toast/store.ts; ARCHITECTURE.md §12.6): which toasts leave on their own and
// when, what stops the clock, and what the announcer is asked to speak.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  announce,
  attach,
  getSnapshot,
  pause,
  resume,
  show,
  speakThrough,
  toast,
} from '../../src/toast/store';

const ids = (): string[] => getSnapshot().map((record) => record.id);

let detach: () => void;
let spoken: Array<[string, string]>;
let unregister: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  detach = attach();
  spoken = [];
  unregister = speakThrough((text, politeness) => spoken.push([text, politeness]));
});

afterEach(() => {
  toast.dismiss();
  unregister();
  detach();
  show([]);
  vi.useRealTimers();
});

test('a plain toast leaves after 5 s while shown; one with an action, or critical, stays', () => {
  const plain = toast('Product saved');
  const undo = toast('Order archived', { action: { label: 'Undo', onAction: () => {} } });
  const failed = toast('Couldn’t publish 2 products', { tone: 'critical' });
  show(ids());
  expect(getSnapshot().map((record) => record.timeout)).toEqual([5000, null, null]);
  vi.advanceTimersByTime(4999);
  expect(ids()).toEqual([plain, undo, failed]);
  vi.advanceTimersByTime(1);
  expect(ids()).toEqual([undo, failed]);
  vi.advanceTimersByTime(60_000);
  expect(ids()).toEqual([undo, failed]);
});

test('`timeout` sets a plain toast’s time, and an action or critical tone still overrides it', () => {
  toast('Copied', { timeout: 2000 });
  toast('Retry?', { timeout: 2000, action: { label: 'Retry', onAction: () => {} } });
  expect(getSnapshot().map((record) => record.timeout)).toEqual([2000, null]);
});

test('the clock runs only while the toast is shown, a Toaster is mounted and nothing pauses it', () => {
  const id = toast('Product saved');
  vi.advanceTimersByTime(10_000);
  expect(ids()).toEqual([id]); // waiting: not shown yet
  show([id]);
  vi.advanceTimersByTime(3000);
  pause('region');
  pause('hidden');
  vi.advanceTimersByTime(10_000);
  resume('region');
  vi.advanceTimersByTime(10_000);
  expect(ids()).toEqual([id]); // still hidden
  resume('hidden');
  vi.advanceTimersByTime(1999);
  expect(ids()).toEqual([id]);
  vi.advanceTimersByTime(1);
  expect(ids()).toEqual([]);
});

test('with no Toaster mounted, no clock runs', () => {
  detach();
  const id = toast('Product saved');
  show([id]);
  vi.advanceTimersByTime(10_000);
  expect(ids()).toEqual([id]);
  detach = attach();
  vi.advanceTimersByTime(5000);
  expect(ids()).toEqual([]);
});

test('an id updates a toast in place and restarts its time; dismiss calls onClose once', () => {
  const onClose = vi.fn<() => void>();
  toast('Saving…', { id: 'save', timeout: 10_000, onClose });
  show(['save']);
  vi.advanceTimersByTime(8000);
  toast('Saved', { id: 'save', tone: 'success', onClose });
  expect(getSnapshot()).toHaveLength(1);
  expect(getSnapshot()[0]?.message).toBe('Saved');
  vi.advanceTimersByTime(4999);
  expect(ids()).toEqual(['save']);
  vi.advanceTimersByTime(1);
  expect(ids()).toEqual([]);
  expect(onClose).toHaveBeenCalledTimes(1);
  toast.dismiss('save');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('each toast is spoken once: message then description, assertive only when critical', () => {
  toast('Product saved', { description: 'It is live in your store.', tone: 'success' });
  toast('Couldn’t publish', { tone: 'critical' });
  toast('Archived.', { description: 'Undo within a day.' });
  expect(spoken).toEqual([
    ['Product saved. It is live in your store.', 'polite'],
    ['Couldn’t publish', 'assertive'],
    ['Archived. Undo within a day.', 'polite'],
  ]);
});

test('announce() speaks through the registered announcer and warns with none', () => {
  announce('3 results');
  announce('Connection lost', 'assertive');
  expect(spoken).toEqual([
    ['3 results', 'polite'],
    ['Connection lost', 'assertive'],
  ]);
  unregister();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  announce('Nobody hears this');
  expect(warn).toHaveBeenCalledOnce();
});

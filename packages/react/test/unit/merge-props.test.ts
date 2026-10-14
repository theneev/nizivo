import { describe, expect, test, vi } from 'vitest';
import { mergeProps } from '../../src/contracts/merge-props';

function handler(): void {}

/** Calls a merged prop that must be a function. */
function call(fn: unknown, arg: unknown): unknown {
  if (typeof fn !== 'function') throw new Error('expected a function');
  return fn(arg);
}

describe('mergeProps(ours, theirs)', () => {
  test('className is concatenated, ours first', () => {
    expect(mergeProps({ className: 'nz-button' }, { className: 'w-full' }).className).toBe(
      'nz-button w-full',
    );
  });

  test('style is shallow-merged, theirs winning', () => {
    expect(mergeProps({ style: { a: 1, b: 1 } }, { style: { b: 2 } }).style).toEqual({
      a: 1,
      b: 2,
    });
  });

  test('handlers run theirs first; ours skip when the event was defaultPrevented', () => {
    const calls: string[] = [];
    const merged = mergeProps(
      { onClick: () => calls.push('ours') },
      { onClick: (e: { preventDefault(): void }) => (calls.push('theirs'), e.preventDefault()) },
    );
    const event = {
      defaultPrevented: false,
      preventDefault: () => (event.defaultPrevented = true),
    };
    call(merged.onClick, event);
    expect(calls).toEqual(['theirs']);

    const order: string[] = [];
    const both = mergeProps(
      { onBlur: () => order.push('ours') },
      { onBlur: () => order.push('theirs') },
    );
    call(both.onBlur, { defaultPrevented: false });
    expect(order).toEqual(['theirs', 'ours']);
  });

  test('creates a function only when both sides supply one', () => {
    expect(mergeProps({ id: 'a' }, { onClick: handler }).onClick).toBe(handler);
    expect(mergeProps({ onClick: handler }, { id: 'a' }).onClick).toBe(handler);
    const ref = { current: null };
    expect(mergeProps({ ref }, {}).ref).toBe(ref);
  });

  test('refs are merged into one callback, with cleanup', () => {
    const object = { current: null as unknown };
    const callback = vi.fn<(node: unknown) => void>();
    const cleanup = call(mergeProps({ ref: object }, { ref: callback }).ref, 'node');
    expect(object.current).toBe('node');
    expect(callback).toHaveBeenCalledWith('node');
    call(cleanup, undefined);
    expect(object.current).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  test('undefined never overrides; later defined values win', () => {
    expect(mergeProps({ id: 'engine' }, { id: undefined }).id).toBe('engine');
    expect(mergeProps({ type: 'button' }, { type: 'submit' }).type).toBe('submit');
    expect(mergeProps({ a: 1 }, undefined, { b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

'use client';
// usePointerFx (ARCHITECTURE.md §13.3: `@nizivo/react/pointer-fx`, D-dd; research r6 §3). A card
// that tilts toward the pointer, or a control that leans toward it (magnetic). The hook writes
// where the pointer is over the element, from -1 to 1 on each axis, to `--nz-pointer-x` and
// `--nz-pointer-y` on the element, once per animation frame, and back to 0 when the pointer leaves;
// pointer-fx.css turns them into a transform under the element's `data-pointer-fx`. Only a fine
// pointer that can hover moves it: touch and pen taps never do. Under reduced motion
// (`--nz-duration-fast` is 0 ms, as tokens set it for prefers-reduced-motion and
// [data-nz-motion="reduce"]) it writes nothing, and the lift and pull tokens are 0 too. The server
// renders only the attribute, so hydration changes nothing. `PointerFx` is the same as a component,
// for a server page: `<PointerFx render={<Card />}>`.
import {
  useCallback,
  type ComponentPropsWithRef,
  type ReactElement,
  type RefCallback,
} from 'react';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';

/** `tilt`: rotates toward the pointer and lifts. `magnetic`: moves toward the pointer. */
export type PointerFxEffect = 'tilt' | 'magnetic';

export interface PointerFxOptions {
  /** @default 'tilt' */
  effect?: PointerFxEffect | undefined;
}

/** Spread on the element: `<div {...usePointerFx()}>`. */
export interface PointerFxHookProps<E extends HTMLElement> {
  ref: RefCallback<E>;
  'data-pointer-fx': PointerFxEffect;
}

const X = '--nz-pointer-x';
const Y = '--nz-pointer-y';

export function usePointerFx<E extends HTMLElement = HTMLElement>({
  effect = 'tilt',
}: PointerFxOptions = {}): PointerFxHookProps<E> {
  const ref = useCallback((el: E | null) => {
    if (el === null) return undefined;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const write = (): void => {
      frame = 0;
      el.style.setProperty(X, x.toFixed(3));
      el.style.setProperty(Y, y.toFixed(3));
    };
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(write);
    };
    const move = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse' || !fine.matches) return;
      if (parseFloat(getComputedStyle(el).getPropertyValue('--nz-duration-fast')) === 0) return;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      x = ((event.clientX - box.left) / box.width) * 2 - 1;
      y = ((event.clientY - box.top) / box.height) * 2 - 1;
      schedule();
    };
    const leave = (): void => {
      x = 0;
      y = 0;
      schedule();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.style.removeProperty(X);
      el.style.removeProperty(Y);
    };
  }, []);
  return { ref, 'data-pointer-fx': effect };
}

export interface PointerFxState {
  effect: PointerFxEffect;
}

export interface PointerFxProps extends ComponentPropsWithRef<'div'> {
  /** @default 'tilt' */
  effect?: PointerFxEffect;
  /** The element that moves: `render={<Card />}`. Defaults to a `<div>`. */
  render?: RenderProp<PointerFxState>;
}

export function PointerFx({ effect = 'tilt', render, ...rest }: PointerFxProps): ReactElement {
  const fx = usePointerFx<HTMLDivElement>({ effect });
  return renderElement(
    'div',
    render,
    { effect },
    mergeProps({ ref: fx.ref, 'data-pointer-fx': fx['data-pointer-fx'] }, rest),
  );
}

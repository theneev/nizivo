'use client';
// CountUp and useCountUp (ARCHITECTURE.md §13.3 "Count-up", §13.4: `@nizivo/react/motion`; Figma 04
// §5). The only client part of the dashboard set. The server renders the FINAL formatted value in the
// same <data> element NumberValue renders, so swapping one for the other changes no box and a page
// without JavaScript shows the right number. On the client the digits count up with
// requestAnimationFrame, only while the element is in the viewport:
// - on mount, from `from` (default 0) when the element first comes into view. A tile that was already
//   on screen when the server HTML hydrated keeps its number: its reader has seen it (04 §5 (a));
// - on a new `value`, from the number on screen, if the element is in view; off screen it just shows
//   the new value (04 §5 (b)).
// Duration: `--nz-duration-count-up` read from the element (900 ms; tokens set it to 0 ms under
// prefers-reduced-motion and [data-nz-motion="reduce"]), so reduced motion is the token swap of
// §13.2 rule 3 and wins over a `duration` prop. The markup never depends on it.
// Easing: Figma defines none for count-up; 04 §5 proposes easing/enter, cubic-bezier(0, 0, 0, 1),
// which has a closed form: with control points (0,0) and (0,1), x(s) = s³ and y(s) = 3s² − 2s³, so
// y(x) = s²(3 − 2s) with s = ∛x.
// No layout shift: tabular figures (motion.css), and while counting the digits keep the final
// string's measured width. Assistive tech reads the final value from visually hidden text; the
// counting digits are aria-hidden and there is no live region (04 §2 A11y).
import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactElement,
  type RefObject,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { formatNumber } from '../number-value/number-value';
import { cx } from '../_internal/cx';

export interface CountUpOptions {
  /** `Intl.NumberFormat` options, as NumberValue takes them. @default {} */
  format?: Intl.NumberFormatOptions | undefined;
  /** BCP 47 tag for the number. @default 'en-US' */
  locale?: string | undefined;
  /**
   * Milliseconds. The default reads `--nz-duration-count-up` from the element (900 ms). Under reduced
   * motion that token is 0 ms and the value is shown at once, whatever this says.
   */
  duration?: number | undefined;
  /** Where the first count starts. Later counts start from the number on screen. @default 0 */
  from?: number | undefined;
}

/** NumberValue's state: the final value and its formatted text. */
export interface CountUpState {
  value: number;
  /** The final formatted text, which the server renders and assistive tech reads. */
  text: string;
}

export interface CountUpProps
  extends CountUpOptions, Omit<ComponentPropsWithRef<'data'>, 'children' | 'value'> {
  value: number;
  render?: RenderProp<CountUpState>;
}

const noop = (): (() => void) => () => {};
const decimals = (n: number): number => (String(n).split('.')[1] ?? '').length;

/**
 * Counts the text of `ref`'s element up to `value`, formatted with `formatNumber` (so every frame
 * reads like the server's text). Render the final formatted value in that element yourself; the hook
 * only writes frames and gives the element the final string's width while it counts (make it
 * `inline-block`). Keep it `aria-hidden` and put the final value in visually hidden text beside it.
 */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  value: number,
  options: CountUpOptions = {},
): void {
  // true only when this mount hydrates server HTML (React reads the server snapshot then)
  const [hydrated] = useState(
    useSyncExternalStore(
      noop,
      () => false,
      () => true,
    ),
  );
  // the options of the render that set `value`, read without restarting a count on every render
  const read = useEffectEvent(() => options);
  // shown: the number on screen once a count has run; seen: in the viewport; wait: the mount count
  const memory = useRef<{
    shown?: number;
    seen?: boolean | undefined;
    wait?: (() => void) | undefined;
  }>({});

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return undefined;
    const state = memory.current;
    // formatNumber's own defaults apply to an absent format or locale
    const { format, locale, duration, from = 0 } = read();
    const write = (n: number): void => {
      state.shown = n;
      el.textContent = formatNumber(n, format, locale);
    };
    const begin = state.shown ?? from;
    const step = 10 ** Math.max(decimals(begin), decimals(value));
    let frame = 0;
    const count = (): void => {
      const token = getComputedStyle(el).getPropertyValue('--nz-duration-count-up');
      const ms = Number.parseFloat(token) * (token.includes('ms') ? 1 : 1000);
      const total = ms === 0 ? 0 : (duration ?? ms);
      // the final text first: it is what the box measures, and what stays without a count
      write(value);
      if (!(total > 0) || begin === value) return;
      // the used width, unscaled (a transformed ancestor scales getBoundingClientRect's). Chromium
      // writes it to six figures and floors a length to 1/64 px: 0.005 px more keeps the last 1/64,
      // and is under half of the 1/60 px Firefox rounds to
      el.style.inlineSize = `${Number.parseFloat(getComputedStyle(el).inlineSize) + 0.005}px`;
      let start: number | undefined;
      const tick = (now: number): void => {
        start ??= now;
        const x = Math.min((now - start) / total, 1);
        const s = Math.cbrt(x);
        write(
          x < 1 ? Math.round((begin + (value - begin) * s * s * (3 - 2 * s)) * step) / step : value,
        );
        if (x < 1) frame = requestAnimationFrame(tick);
        else el.style.inlineSize = '';
      };
      write(begin);
      frame = requestAnimationFrame(tick);
    };

    if (state.shown === undefined) {
      // the mount: count now if the element is on screen (a client mount), or on its first entry;
      // a hydrated element already on screen keeps the number its reader has seen
      const box = el.getBoundingClientRect();
      state.seen = box.width > 0 && box.bottom > 0 && box.top < innerHeight;
      if (!state.seen) state.wait = count;
      else if (hydrated) write(value);
      else count();
    } else if (state.seen) {
      count();
    } else {
      write(value);
    }
    const observer = new IntersectionObserver(([entry]) => {
      state.seen = entry?.isIntersecting;
      if (state.seen && state.wait) {
        state.wait();
        state.wait = undefined;
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      state.wait = undefined;
      el.style.inlineSize = '';
    };
  }, [ref, hydrated, value]);
}

/**
 * NumberValue's `<data>` with the final value, counted up on the client. A client leaf: under RSC it
 * is the one dashboard part that ships JavaScript (§17.2).
 */
export function CountUp(props: CountUpProps): ReactElement {
  const {
    value,
    format,
    locale,
    duration: _duration,
    from: _from,
    render,
    className,
    ...rest
  } = props;
  const digits = useRef<HTMLSpanElement>(null);
  useCountUp(digits, value, props);
  const text = formatNumber(value, format, locale);
  return renderElement(
    'data',
    render,
    { value, text },
    {
      'data-slot': 'count-up',
      ...rest,
      value: String(value),
      className: cx('nz-number-value', 'nz-count-up', className),
      children: (
        <>
          <span
            ref={digits}
            className="nz-count-up-value"
            data-slot="count-up-value"
            aria-hidden="true"
          >
            {text}
          </span>
          <span className="nz-visually-hidden nz-count-up-label">{text}</span>
        </>
      ),
    },
  );
}

'use client';
// Slider (ARCHITECTURE.md §21.4a; D-do; Figma's Slider 7367:345): a value in a range, a native
// `<input type="range">`, so the role, the arrow keys (±1 step), Page Up / Page Down, Home / End and
// form submission are the browser's. The label and the value sit above the track, the value always
// written out; `valueText` gives a screen reader the same words ("30%"). The fill is drawn from a
// custom property set on the client (no style attribute, for a strict CSP; Firefox draws its own
// with ::-moz-range-progress), so before hydration the track shows no fill.
// UNSTABLE: v0.5 is new and unreviewed.
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ComponentPropsWithRef,
  type JSX,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface SliderState {
  value: number;
  disabled: boolean;
}

export interface SliderProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'children'
> {
  /** The visible name. Without it, name the slider with `aria-label`. */
  label?: ReactNode;
  /** The value (controlled). */
  value?: number;
  /** The value at first (uncontrolled). @default min */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  /**
   * How far the arrow keys move it, when not one `step`: a media scrubber steps 1 second and seeks
   * 5. Page Up, Page Down, Home and End stay the browser's. @default step
   */
  keyStep?: number;
  /** The value in words, shown above the track and read by a screen reader. @default the number, formatted */
  valueText?: (value: number) => string;
  /** Number format for the default value text. */
  format?: Intl.NumberFormatOptions;
  /** BCP 47 tag for the default value text. @default 'en-US' */
  locale?: string;
  /** Shows the value text above the track. @default true */
  showValue?: boolean;
  /** The input's `name`, for a form that posts it. */
  name?: string;
  /** @default false */
  disabled?: boolean;
  /** Names the input when there is no `label`. */
  'aria-label'?: string;
  /** Must render a `<div>`. */
  render?: RenderProp<SliderState>;
}

export function Slider({
  label,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  keyStep,
  valueText,
  format,
  locale = 'en-US',
  showValue = true,
  name,
  disabled = false,
  'aria-label': ariaLabel,
  render,
  className,
  ...rest
}: SliderProps): JSX.Element {
  const [own, setOwn] = useState(defaultValue ?? min);
  const current = value === undefined ? own : value;
  const input = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const text = valueText?.(current) ?? new Intl.NumberFormat(locale, format).format(current);
  const share = max > min ? ((current - min) / (max - min)) * 100 : 0;

  function commit(next: number): void {
    setOwn(next);
    onValueChange?.(next);
  }

  // the fill, through the CSSOM: a style attribute would need 'unsafe-inline' under a strict CSP
  useLayoutEffect(() => {
    input.current?.style.setProperty('--_nz-slider-fill', `${Math.min(Math.max(share, 0), 100)}%`);
  }, [share]);

  return renderElement(
    'div',
    render,
    { value: current, disabled },
    {
      'data-slot': 'slider',
      'data-disabled': disabled ? '' : undefined,
      ...rest,
      className: cx('nz-slider', className),
      children: (
        <>
          {(label != null || showValue) && (
            <div className="nz-slider-top">
              {label != null && (
                <label className="nz-slider-label" data-slot="slider-label" htmlFor={inputId}>
                  {label}
                </label>
              )}
              {showValue && (
                <span className="nz-slider-value" data-slot="slider-value" aria-hidden="true">
                  {text}
                </span>
              )}
            </div>
          )}
          <input
            ref={input}
            id={inputId}
            type="range"
            className="nz-slider-input"
            data-slot="slider-input"
            min={min}
            max={max}
            step={step}
            value={current}
            name={name}
            disabled={disabled}
            aria-label={label == null ? ariaLabel : undefined}
            aria-valuetext={text}
            onChange={(event: ChangeEvent<HTMLInputElement>) => commit(Number(event.target.value))}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (keyStep === undefined) return;
              const forward = getComputedStyle(event.currentTarget).direction === 'rtl' ? -1 : 1;
              const by = {
                ArrowRight: keyStep * forward,
                ArrowLeft: -keyStep * forward,
                ArrowUp: keyStep,
                ArrowDown: -keyStep,
              }[event.key];
              if (by === undefined) return;
              event.preventDefault();
              commit(Math.min(Math.max(current + by, min), max));
            }}
          />
        </>
      ),
    },
  );
}

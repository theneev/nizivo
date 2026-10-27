'use client';
// WordRotator (ARCHITECTURE.md §21.4a; D-dq; Figma's Word Rotator 7390:161): the keyword of a headline
// that changes, "Design for dashboards / commerce / websites". Each word holds for 1.8 seconds, then
// the next slides up in about 450 ms (--nz-duration-slower, --nz-easing-enter). A screen reader hears
// every word once, as a list ("dashboards, commerce and websites"); the moving window is hidden from
// it. Under Reduced motion (the media query, or `data-nz-motion="reduce"` above it) the first word
// stays. The offset is set through the CSSOM, so no style attribute is rendered.
// UNSTABLE: v0.6 is new and unreviewed.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type JSX,
} from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface WordRotatorProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** The words, in order: at least two. */
  words: readonly string[];
  /** BCP 47 tag for the spoken list. @default 'en-US' */
  locale?: string;
  /** Must render a `<span>`. */
  render?: RenderProp<Record<string, never>>;
}

/** How long a word stays, then how long the slide takes, in milliseconds (Figma). */
const HOLD = 1800;
const SLIDE = 450;

function reduced(element: Element | null): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    element?.closest('[data-nz-motion="reduce"]') != null
  );
}

export function WordRotator({
  words,
  locale = 'en-US',
  render,
  className,
  ...rest
}: WordRotatorProps): JSX.Element {
  const list = useRef<HTMLSpanElement | null>(null);
  // index runs to words.length, a copy of the first word, then snaps back to 0 unseen
  const [at, setAt] = useState({ index: 0, slide: true });

  useEffect(() => {
    if (words.length < 2 || reduced(list.current)) return undefined;
    const timer = setInterval(() => {
      setAt((now) =>
        now.index >= words.length
          ? { index: 1, slide: true }
          : { index: now.index + 1, slide: true },
      );
    }, HOLD + SLIDE);
    return () => clearInterval(timer);
  }, [words.length]);

  // after the slide onto the copy of the first word, jump back to the real one without a slide
  useEffect(() => {
    if (at.index !== words.length) return undefined;
    const timer = setTimeout(() => setAt({ index: 0, slide: false }), SLIDE);
    return () => clearTimeout(timer);
  }, [at.index, words.length]);

  useLayoutEffect(() => {
    list.current?.style.setProperty('--_nz-word-rotator-index', String(at.index));
  }, [at.index]);

  const spoken = new Intl.ListFormat(locale, { type: 'conjunction' }).format(words);
  return renderElement(
    'span',
    render,
    {},
    {
      'data-slot': 'word-rotator',
      ...rest,
      className: cx('nz-word-rotator', className),
      children: (
        <>
          <span className="nz-visually-hidden">{spoken}</span>
          <span className="nz-word-rotator-window" aria-hidden="true">
            <span
              ref={list}
              className={cx('nz-word-rotator-words', !at.slide && 'nz-word-rotator-snap')}
            >
              {[...words, words[0]].map((word, index) => (
                // oxlint-disable-next-line react/no-array-index-key -- a word may repeat (the copy)
                <span key={index} className="nz-word-rotator-word">
                  {word}
                </span>
              ))}
            </span>
          </span>
        </>
      ),
    },
  );
}

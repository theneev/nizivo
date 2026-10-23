'use client';
// The shell's bottom inset (ARCHITECTURE.md §12.6): while the MobileTabBar is laid out, its height
// goes to --nz-layout-bottom-inset on <html> and data-nz-bottom-bar is set there, in a layout effect
// so the first paint already clears it. A ResizeObserver follows the bar: a safe-area change, a
// font-size change, or the shell hiding it at 640 px (height 0, both removed). Renders an empty,
// hidden span to find its bar.
import { useLayoutEffect, useRef, type ReactElement } from 'react';

const INSET = '--nz-layout-bottom-inset';
const MARK = 'data-nz-bottom-bar';

export function MobileTabBarInset(): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current?.parentElement;
    if (bar == null || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement;
    const write = (): void => {
      const height = bar.getBoundingClientRect().height;
      if (height > 0) {
        root.style.setProperty(INSET, `${height}px`);
        root.setAttribute(MARK, '');
      } else {
        root.style.removeProperty(INSET);
        root.removeAttribute(MARK);
      }
    };
    write();
    const observer = new ResizeObserver(write);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty(INSET);
      root.removeAttribute(MARK);
    };
  }, []);
  return <span ref={ref} hidden />;
}

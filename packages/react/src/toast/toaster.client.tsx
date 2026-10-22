'use client';
// The Toaster (ARCHITECTURE.md §12.6, §12.1 L3): the region that shows the store's toasts and the
// announcer that speaks them. Render one, in the root layout. The region is the only top-layer
// element of the overlay family: a `<section popover="manual">` portalled to <body>, shown while a
// toast exists, raised again when one arrives while focus is elsewhere, and exempt from a modal's
// inert and aria-hidden like the announcer. Without the Popover API it is a fixed element on
// `--nz-z-toast`.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../button/button';
import { iconButtonElement } from '../icon-button/icon-button-static';
import { cx } from '../_internal/cx';
import { CircleCheckGlyph, CircleXGlyph, CloseGlyph, InfoGlyph } from '../_internal/glyphs';
import { markTopLayer, useItem, useRegion } from './engine';
import {
  attach,
  getServerSnapshot,
  getSnapshot,
  pause,
  resume,
  show,
  speakThrough,
  subscribe,
  toast as queue,
} from './store';
import type { ToastRecord, ToastRegionOptions } from './seam';
import type { Politeness, ToasterLabels, ToasterProps } from './toast.contract';

const LABELS: ToasterLabels = { region: 'Notifications (F8)', dismiss: 'Dismiss' };

/** How long a spoken message stays in the announcer, as React Aria's announcer keeps it. */
const SPOKEN_FOR = 7000;

const GLYPHS = {
  neutral: InfoGlyph,
  success: CircleCheckGlyph,
  critical: CircleXGlyph,
} as const;

const popoverApi = (element: HTMLElement): boolean => 'showPopover' in element;

const noSubscription = (): (() => void) => () => {};

/** On the page in the browser only: the queue, the portals and the announcer are client state. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/** Focus back to where it was before F8, if that element is still on the page. */
function returnFocus(returnTo: RefObject<HTMLElement | null>): void {
  const to = returnTo.current;
  returnTo.current = null;
  if (to?.isConnected === true) to.focus();
}

/**
 * Two visually hidden live regions, polite and assertive, on the page from the Toaster's mount
 * before any message, and marked top layer so a modal's aria-hidden never silences them (O-06).
 */
function Announcer(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState<Record<Politeness, string>>({ polite: '', assertive: '' });
  useLayoutEffect(() => {
    const element = ref.current;
    return element === null ? undefined : markTopLayer(element);
  }, []);
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, run: () => void): void => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        run();
      }, ms);
      timers.add(timer);
    };
    const unregister = speakThrough((text, politeness) => {
      // Emptied first, then filled a moment later: the same text twice is spoken twice, and a
      // region filled in the frame it appears is not missed.
      setSaid((current) => ({ ...current, [politeness]: '' }));
      later(100, () => setSaid((current) => ({ ...current, [politeness]: text })));
      later(SPOKEN_FOR, () =>
        setSaid((current) =>
          current[politeness] === text ? { ...current, [politeness]: '' } : current,
        ),
      );
    });
    return () => {
      unregister();
      for (const timer of timers) clearTimeout(timer);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="nz-toast-announcer nz-visually-hidden"
      data-slot="toast-announcer"
      data-nz-top-layer=""
    >
      <div aria-live="polite" aria-atomic="true">
        {said.polite}
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {said.assertive}
      </div>
    </div>
  );
}

function ToastItem({
  toast,
  options,
  labels,
}: {
  toast: ToastRecord;
  options: ToastRegionOptions;
  labels: ToasterLabels;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const { toastProps, messageProps, descriptionProps } = useItem(toast, options, ref);
  // Escape dismisses the toast that has focus, and goes no further: a Dialog under the stack stays
  // open (O-06). A native listener: the element is a dialog, not a control.
  const { close } = options;
  const { id } = toast;
  useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      close(id);
    };
    element.addEventListener('keydown', onKey);
    return () => element.removeEventListener('keydown', onKey);
  }, [close, id]);
  const Glyph = GLYPHS[toast.tone];
  // The close button's part: it owns the slot (§8.2), over IconButton's own.
  const closePart = { 'data-slot': 'toast-close', className: 'nz-toast-close' };
  const { action } = toast;
  return (
    <div
      {...toastProps}
      ref={ref}
      className="nz-toast"
      data-slot="toast"
      data-tone={toast.tone}
      data-nz-scheme="inverse"
    >
      <span className="nz-toast-icon" data-slot="toast-icon" aria-hidden="true">
        <Glyph />
      </span>
      <div className="nz-toast-content" data-slot="toast-content">
        <div {...messageProps} className="nz-toast-message" data-slot="toast-message">
          {toast.message}
        </div>
        {toast.description !== undefined && (
          <div {...descriptionProps} className="nz-toast-description" data-slot="toast-description">
            {toast.description}
          </div>
        )}
      </div>
      {action !== undefined && (
        <Button
          variant="tertiary"
          size="sm"
          className="nz-toast-action"
          data-slot="toast-action"
          onClick={() => {
            action.onAction();
            options.close(toast.id);
          }}
        >
          {action.label}
        </Button>
      )}
      {iconButtonElement({
        label: labels.dismiss,
        icon: <CloseGlyph />,
        variant: 'tertiary',
        size: 'sm',
        ...closePart,
        onClick: () => options.close(toast.id),
      })}
    </div>
  );
}

/** The region and its toasts, once the page has hydrated. */
function Stack({
  toasts,
  strings,
  hotkey,
  className,
}: {
  toasts: readonly ToastRecord[];
  strings: ToasterLabels;
  hotkey: string;
  className: string | undefined;
}): ReactElement {
  const region = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const count = toasts.length;

  // The shortcut, from anywhere: into the stack, or back out of it.
  const showing = useRef(count);
  useLayoutEffect(() => {
    showing.current = count;
  });
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== hotkey || event.altKey || event.ctrlKey || event.metaKey) return;
      const element = region.current;
      if (element === null || showing.current === 0) return;
      event.preventDefault();
      const active = document.activeElement;
      if (active !== null && element.contains(active)) returnFocus(returnTo);
      else {
        returnTo.current = active instanceof HTMLElement ? active : null;
        element.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hotkey]);

  // Escape on the stack itself, not on a toast: leave it.
  useEffect(() => {
    const element = region.current;
    if (element === null) return undefined;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.target !== element) return;
      event.preventDefault();
      event.stopPropagation();
      returnFocus(returnTo);
    };
    element.addEventListener('keydown', onKey);
    return () => element.removeEventListener('keydown', onKey);
  }, []);

  // Shown in the top layer while a toast exists; raised again when one arrives while focus is
  // outside the stack, so it stays above a native modal dialog opened since (§12.1 L3).
  const latest = toasts.at(-1)?.id;
  useLayoutEffect(() => {
    const element = region.current;
    if (element === null || !popoverApi(element)) return;
    const open = element.matches(':popover-open');
    if (latest === undefined) {
      if (open) element.hidePopover();
      return;
    }
    if (open && !element.contains(document.activeElement)) element.hidePopover();
    if (!element.matches(':popover-open')) element.showPopover();
  }, [latest]);

  // The stack's height above the viewport's bottom edge, for scroll-padding in nz.base: a control
  // brought into view by focus is not left under the stack (WCAG 2.4.11, O-13).
  useLayoutEffect(() => {
    const element = region.current;
    const root = document.documentElement;
    if (element === null || count === 0) {
      root.style.removeProperty('--nz-toast-inset');
      return undefined;
    }
    const measure = (): void => {
      const inset = Math.max(0, window.innerHeight - element.getBoundingClientRect().top);
      root.style.setProperty('--nz-toast-inset', `${Math.ceil(inset)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--nz-toast-inset');
    };
  }, [count]);

  const options: ToastRegionOptions = {
    toasts,
    label: strings.region,
    close: queue.dismiss,
    pause: () => pause('region'),
    resume: () => resume('region'),
  };
  const regionProps = useRegion(options, region);

  // The region stays on the page, empty and hidden, between toasts: the engine registers its
  // landmark once, and the top layer only takes it while a toast shows.
  return (
    <section
      {...regionProps}
      ref={region}
      popover="manual"
      hidden={count === 0}
      className={cx('nz-toast-region', className)}
      data-slot="toast-region"
      data-nz-top-layer=""
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} options={options} labels={strings} />
      ))}
    </section>
  );
}

/**
 * Shows the toasts `toast()` adds, bottom-centre, newest last, and speaks each once. F8 moves focus
 * to the stack; Tab moves within it; Escape dismisses the focused toast; F8 again, or Escape on the
 * stack itself, returns focus to where it was. Render one, in the root layout.
 */
export function Toaster({
  labels,
  limit = 3,
  hotkey = 'F8',
  className,
}: ToasterProps): ReactElement {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toasts = all.slice(-limit);
  const hydrated = useHydrated();
  const ids = toasts.map((toast) => toast.id).join(' ');

  useEffect(attach, []);
  useEffect(() => show(ids === '' ? [] : ids.split(' ')), [ids]);

  // The clock stops while the page is hidden (§12.6).
  useEffect(() => {
    const update = (): void => (document.hidden ? pause('hidden') : resume('hidden'));
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      resume('hidden');
    };
  }, []);

  if (!hydrated) return <></>;
  return (
    <>
      {createPortal(
        <Stack
          toasts={toasts}
          strings={{ ...LABELS, ...labels }}
          hotkey={hotkey}
          className={className}
        />,
        document.body,
      )}
      {createPortal(<Announcer />, document.body)}
    </>
  );
}

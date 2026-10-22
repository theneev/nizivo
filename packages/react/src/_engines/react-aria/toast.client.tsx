'use client';
// The Toast's react-aria adapter (ARCHITECTURE.md §12.6). React Aria's toast hooks only render
// Nizivo's own queue: the store (src/toast/store.ts) holds the toasts and their clocks, and these
// hooks add the region's landmark (F6), pausing while the pointer or focus is in it, where focus goes
// as a focused toast leaves, each toast's dialog semantics and the top-layer exemption. React Aria's
// queue and timers are not used: its toasts here carry no `timer`, so useToast starts none.
import type { HTMLAttributes, RefObject } from 'react';
import { useToast, useToastRegion } from 'react-aria/useToast';
import type { ToastItemAria, ToastRecord, ToastRegionOptions } from '../../toast/seam';
import type { ToastEngine } from '../../toast/toast.contract';
import { markTopLayer } from './overlay.client';

type State = Parameters<typeof useToastRegion<ToastRecord>>[1];

/** The ToastState the hooks read, over the store: React Aria never adds a toast here. */
function state(options: ToastRegionOptions): State {
  return {
    visibleToasts: options.toasts.map((toast) => ({ key: toast.id, content: toast })),
    add: () => '',
    close: options.close,
    pauseAll: options.pause,
    resumeAll: options.resume,
  };
}

export function useRegion(
  options: ToastRegionOptions,
  ref: RefObject<HTMLElement | null>,
): HTMLAttributes<HTMLElement> {
  const { regionProps } = useToastRegion({ 'aria-label': options.label }, state(options), ref);
  return regionProps;
}

export function useItem(
  toast: ToastRecord,
  options: ToastRegionOptions,
  ref: RefObject<HTMLElement | null>,
): ToastItemAria {
  // contentProps (role="alert") is left out: a toast is spoken once, by the announcer, never by a
  // live region of its own (§12.6). closeButtonProps too: the close button is Nizivo's.
  const { toastProps, titleProps, descriptionProps } = useToast(
    { toast: { key: toast.id, content: toast } },
    state(options),
    ref,
  );
  const { 'aria-describedby': describedBy, ...rest } = toastProps;
  return {
    toastProps:
      toast.description === undefined ? rest : { ...rest, 'aria-describedby': describedBy },
    messageProps: titleProps,
    descriptionProps,
  };
}

export { markTopLayer };

export const toastEngine: ToastEngine = { useRegion, useItem, markTopLayer };

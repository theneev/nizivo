// The types between the Toaster and its engine, kept out of the public API: toast.contract.ts
// exports only what an app writes. NO directive.
import type { HTMLAttributes } from 'react';
import type { ToastAction, ToastTone } from './toast.contract';

/** A toast in the queue, as the Toaster renders it. */
export interface ToastRecord {
  id: string;
  message: string;
  tone: ToastTone;
  description: string | undefined;
  action: ToastAction | undefined;
  /** `null`: it stays until dismissed. */
  timeout: number | null;
}

/** What the store hands the engine for one render of the region. */
export interface ToastRegionOptions {
  toasts: readonly ToastRecord[];
  label: string;
  close: (id: string) => void;
  /** The pointer is over the stack or focus is in it. */
  pause: () => void;
  resume: () => void;
}

/** A toast's element props from the engine: a non-modal alertdialog, named by its message, not live. */
export interface ToastItemAria {
  toastProps: HTMLAttributes<HTMLElement>;
  messageProps: HTMLAttributes<HTMLElement>;
  descriptionProps: HTMLAttributes<HTMLElement>;
}

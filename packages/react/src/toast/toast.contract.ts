// Public, engine-free types and the ToastEngine interface (ARCHITECTURE.md §9.2, §12.6).
// NO directive. The .d.ts import-graph walk must never reach an engine from here.
import type { HTMLAttributes, RefObject } from 'react';
import type { ToastItemAria, ToastRecord, ToastRegionOptions } from './seam';

/** Figma "Tone". Critical is announced assertively and stays until dismissed. */
export type ToastTone = 'neutral' | 'success' | 'critical';

/** How a message is spoken: `polite` waits for the reader to finish, `assertive` interrupts. */
export type Politeness = 'polite' | 'assertive';

export interface ToastAction {
  /** The button's text, one or two words: "Undo", "View". */
  label: string;
  /** Runs on press; the toast then closes. */
  onAction: () => void;
}

export interface ToastOptions {
  /** @default 'neutral' */
  tone?: ToastTone;
  /** A second line under the message. */
  description?: string;
  /**
   * One action, a real button. A toast with an action stays until it is dismissed (WCAG 2.2.1,
   * §12.6), whatever `timeout` says.
   */
  action?: ToastAction;
  /**
   * Milliseconds before a toast without an action, and not critical, leaves. The time stops while
   * the pointer is over the stack, while focus is in it and while the page is hidden.
   * @default 5000
   */
  timeout?: number;
  /**
   * Updates the toast with this id in place, if it is still shown, instead of adding one:
   * `toast('Saving…', { id: 'save' })`, then `toast('Saved', { id: 'save', tone: 'success' })`.
   */
  id?: string;
  /** Called once when the toast leaves, however it left. */
  onClose?: () => void;
}

/** Strings the Toaster renders (§16.4). */
export interface ToasterLabels {
  /** The region's accessible name, which names its shortcut. @default 'Notifications (F8)' */
  region: string;
  /** Each toast's close button. @default 'Dismiss' */
  dismiss: string;
}

export interface ToasterProps {
  labels?: Partial<ToasterLabels>;
  /** Toasts shown at once, newest last. Older ones wait, their time stopped, until one leaves. @default 3 */
  limit?: number;
  /**
   * The key that moves focus into the stack and, pressed again there, back to where it was (the
   * `KeyboardEvent.key` value). @default 'F8'
   */
  hotkey?: string;
  className?: string;
}

/**
 * The seam the react-aria adapter fills (`_engines/react-aria/toast.client.tsx`). The store, the
 * DOM and the announcer are Nizivo's own; the engine supplies the region's landmark and pausing,
 * where focus goes as toasts leave, each toast's dialog semantics and the top-layer exemption.
 */
export interface ToastEngine {
  /** The region's props: a landmark (F6), pausing on hover and focus, the top-layer exemption. */
  useRegion(
    options: ToastRegionOptions,
    ref: RefObject<HTMLElement | null>,
  ): HTMLAttributes<HTMLElement>;
  useItem(
    toast: ToastRecord,
    options: ToastRegionOptions,
    ref: RefObject<HTMLElement | null>,
  ): ToastItemAria;
  /** Keeps an element interactive and unhidden above a modal (the announcer). Returns an undo. */
  markTopLayer(element: Element): () => void;
}

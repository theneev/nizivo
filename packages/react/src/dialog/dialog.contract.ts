// Public, engine-free types and the DialogEngine interface (ARCHITECTURE.md §9.2, §10.4, §12.3). NO directive.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { EnginePart } from '../_internal/engine-part';
import type { ReturnFocusTarget } from '../_internal/overlay';

export type { OpenReason };

/** The dialog's role: `dialog` by default, `alertdialog` for a destructive confirmation. */
export type DialogRole = 'dialog' | 'alertdialog';
/** `md` is the standard width (480 px); `sm` (400) and `lg` (640) are provisional. */
export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogTitleLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Strings the Dialog renders (§9.3 rule 7, §16.4). `close` is the accessible name of the default
 * `Dialog.Close` (an IconButton showing the close glyph), set through that part's `labels`.
 * Engine-owned with React Aria (not overridable): `dismiss`, the visually hidden "Dismiss" button
 * rendered inside a dismissable dialog.
 */
export interface DialogLabels {
  /** @default 'Close' */
  close: string;
  dismiss: string;
}

export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  /**
   * Where focus goes when the dialog closes (§12.2 Focus return). `true` returns it to the trigger
   * (the element that opened the dialog), else to the trigger of the overlay it was opened from (a
   * Menu button, after a Menu item opened it), else it stays on `<body>` and development builds warn.
   * An element ref, or a function returning an element, goes first while that element is on the page;
   * `false` leaves focus where the browser puts it, for an app that moves it itself.
   * @default true
   */
  returnFocus?: ReturnFocusTarget;
  children: ReactNode;
}

export interface DialogTriggerState {
  open: boolean;
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface DialogPopupState {
  entering: boolean;
  exiting: boolean;
}

export interface DialogCloseState {
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface DialogTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Must render a `<button>`, for example `render={<Button variant="critical">Delete</Button>}`. */
  render?: RenderProp<DialogTriggerState>;
  children?: ReactNode;
}

export interface DialogPopupProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'role'> {
  /** `alertdialog` disables outside-press dismissal. @default 'dialog' */
  role?: DialogRole;
  /** @default 'md' */
  size?: DialogSize;
  /** The scrim element. Defaults to on for the root modal and off for nested modals. */
  backdrop?: boolean;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  children: ReactNode;
}

export interface DialogTitleProps extends Omit<ComponentPropsWithRef<'h2'>, 'id'> {
  /** @default 2 */
  level?: DialogTitleLevel;
  render?: RenderProp<Record<string, never>>;
}

export interface DialogDescriptionProps extends Omit<ComponentPropsWithRef<'p'>, 'id'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DialogBodyProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DialogFooterProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DialogCloseProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Must render a `<button>`, for example `render={<Button>Cancel</Button>}`. With neither `render`
   * nor `children`, the part is an IconButton showing the close glyph, named by `labels.close`, which
   * sits in the popup's top corner when it is a direct child of `Dialog.Popup` (§12.3).
   */
  render?: RenderProp<DialogCloseState>;
  /** Text content, rendered in a plain `<button>`; leave it out for the default IconButton. */
  children?: ReactNode;
  /** The default IconButton's accessible name; an `aria-label` you pass wins. */
  labels?: Partial<Pick<DialogLabels, 'close'>>;
}

type NoState = Record<string, never>;

/**
 * What every Dialog adapter implements. Adapters write no class names.
 * Popup structure: positioner (with the backdrop element as its first child, when `backdrop`) →
 * popup → content. With React Aria 1.22.1 the content element is a `<section>` carrying the
 * `dialog`/`alertdialog` role.
 */
export interface DialogEngine {
  /** `returnFocus` stays with the leaf, which hands it to `Popup`. */
  Root(p: Omit<DialogRootProps, 'returnFocus'>): ReactElement;
  Trigger(p: EnginePart<'button', DialogTriggerState>): ReactElement;
  Popup(
    p: EnginePart<'div', DialogPopupState, 'role'> & {
      role: DialogRole;
      backdrop: boolean;
      container?: Element | null | undefined;
      positioner: Record<string, unknown>;
      backdropProps: Record<string, unknown>;
      contentProps: Record<string, unknown>;
      /**
       * The element focused on open, given the content element (§12.2 Focus on open), or null for
       * the engine's default (the popup itself). The leaf resolves it from the documented slots.
       */
      initialFocus: (content: HTMLElement) => HTMLElement | null;
      /** `Dialog.Root`'s `returnFocus`, resolved by the family's focus-return chain (§12.2). */
      returnFocus: ReturnFocusTarget;
    },
  ): ReactElement;
  Title(p: EnginePart<'h2', NoState, 'id'> & { level: DialogTitleLevel }): ReactElement;
  Description(p: EnginePart<'p', NoState, 'id'>): ReactElement;
  Close(p: EnginePart<'button', DialogCloseState>): ReactElement;
}

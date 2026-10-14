// Public, engine-free types and the DialogEngine interface (ARCHITECTURE.md §9.2, §10.4, §12.3). NO directive.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { EnginePart } from '../_internal/engine-part';

export type { OpenReason };

/** Figma Modal `Type`: Default → `dialog`, Destructive → `alertdialog`. */
export type DialogRole = 'dialog' | 'alertdialog';
/** `md` is Figma's only Modal width (480 px); `sm` (400) and `lg` (640) are provisional. */
export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogTitleLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Strings the engine renders (§9.3 rule 7). Engine-owned with React Aria (not overridable): `dismiss`,
 * the visually hidden "Dismiss" button rendered inside a dismissable dialog.
 */
export interface DialogLabels {
  dismiss: string;
}

export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
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
  /** Must render a `<button>`, for example `render={<Button>Cancel</Button>}`. */
  render?: RenderProp<DialogCloseState>;
  children?: ReactNode;
}

type NoState = Record<string, never>;

/**
 * What every Dialog adapter implements. Adapters write no class names.
 * Popup structure: positioner (with the backdrop element as its first child, when `backdrop`) →
 * popup → content. With React Aria 1.22.1 the content element is a `<section>` carrying the
 * `dialog`/`alertdialog` role.
 */
export interface DialogEngine {
  Root(p: DialogRootProps): ReactElement;
  Trigger(p: EnginePart<'button', DialogTriggerState>): ReactElement;
  Popup(
    p: EnginePart<'div', DialogPopupState, 'role'> & {
      role: DialogRole;
      backdrop: boolean;
      container?: Element | null | undefined;
      positioner: Record<string, unknown>;
      backdropProps: Record<string, unknown>;
      contentProps: Record<string, unknown>;
    },
  ): ReactElement;
  Title(p: EnginePart<'h2', NoState, 'id'> & { level: DialogTitleLevel }): ReactElement;
  Description(p: EnginePart<'p', NoState, 'id'>): ReactElement;
  Close(p: EnginePart<'button', DialogCloseState>): ReactElement;
}

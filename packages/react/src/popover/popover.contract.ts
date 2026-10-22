// Public, engine-free types and the PopoverEngine interface (ARCHITECTURE.md §9.2, §12.3 Popover row).
// NO directive. The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, CSSProperties, ReactElement, ReactNode } from 'react';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { Align, Side } from '../contracts/state';
import type { EnginePart } from '../_internal/engine-part';

export type { OpenReason };

/** Logical side; the resolved physical side is `data-side` on the popup. */
export type PopoverSide = 'top' | 'bottom' | 'start' | 'end';
export type PopoverTitleLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Strings the Popover renders (§9.3 rule 7, §16.4). `close` is the accessible name of the default
 * `Popover.Close` (an IconButton showing the close glyph), set through that part's `labels`.
 * Engine-owned with React Aria (not overridable): `dismiss`, the visually hidden "Dismiss" buttons
 * at both ends of the popup.
 */
export interface PopoverLabels {
  /** @default 'Close' */
  close: string;
  dismiss: string;
}

export interface PopoverRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  children: ReactNode;
}

export interface PopoverTriggerState {
  open: boolean;
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface PopoverPopupState {
  entering: boolean;
  exiting: boolean;
  side: Side;
}

export interface PopoverCloseState {
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface PopoverTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Must render a `<button>`, for example `render={<IconButton label="Notifications" … />}`. */
  render?: RenderProp<PopoverTriggerState>;
  children?: ReactNode;
}

export interface PopoverPopupProps {
  /** @default 'bottom' */
  side?: PopoverSide;
  /** @default 'center' */
  align?: Align;
  /** Distance from the trigger in px. @default 8 */
  sideOffset?: number;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  /** Names the popup when it has no `Popover.Title`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface PopoverTitleProps extends Omit<ComponentPropsWithRef<'h2'>, 'id'> {
  /** @default 2 */
  level?: PopoverTitleLevel;
  render?: RenderProp<Record<string, never>>;
}

export interface PopoverDescriptionProps extends Omit<ComponentPropsWithRef<'p'>, 'id'> {
  render?: RenderProp<Record<string, never>>;
}

export interface PopoverCloseProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Must render a `<button>`, for example `render={<Button size="sm">Done</Button>}`. With neither
   * `render` nor `children`, the part is a small IconButton showing the close glyph, named by
   * `labels.close`, which sits in the popup's top corner when it is a direct child of
   * `Popover.Popup`.
   */
  render?: RenderProp<PopoverCloseState>;
  /** Text content, rendered in a plain `<button>`; leave it out for the default IconButton. */
  children?: ReactNode;
  /** The default IconButton's accessible name; an `aria-label` you pass wins. */
  labels?: Partial<Pick<PopoverLabels, 'close'>>;
}

type NoState = Record<string, never>;

/**
 * What every Popover adapter implements. Adapters write no class names. Popup structure: the popup
 * (the positioned element the engine portals) → content (with React Aria 1.22.1 a `<section>`
 * carrying `role="dialog"`). Overlays opened inside it portal into a box-less container placed right
 * after the popup (§12.1 L2).
 */
export interface PopoverEngine {
  Root(p: PopoverRootProps): ReactElement;
  Trigger(p: EnginePart<'button', PopoverTriggerState>): ReactElement;
  Popup(
    p: Omit<EnginePart<'div', PopoverPopupState>, 'role'> & {
      side: PopoverSide;
      align: Align;
      sideOffset: number;
      container?: Element | null | undefined;
      contentProps: Record<string, unknown>;
      /**
       * The element focused on open, given the content element, or null for the engine's default
       * (the content element itself). The leaf resolves it from the documented slots.
       */
      initialFocus: (content: HTMLElement) => HTMLElement | null;
    },
  ): ReactElement;
  Title(p: EnginePart<'h2', NoState, 'id'> & { level: PopoverTitleLevel }): ReactElement;
  Description(p: EnginePart<'p', NoState, 'id'>): ReactElement;
  Close(p: EnginePart<'button', PopoverCloseState>): ReactElement;
}

// Public, engine-free types and the DrawerEngine interface (ARCHITECTURE.md §9.2, §12.3 Drawer / Sheet
// row). NO directive. A Drawer is the Dialog pattern at an edge of the viewport, so its engine seam is
// the Dialog's: the same parts, a modal popup with a scrim, the same focus rules.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { DialogEngine } from '../dialog/dialog.contract';
import type { ReturnFocusTarget } from '../_internal/overlay';

export type { OpenReason };

/**
 * The edge the drawer slides in from, in logical terms: `start` and `end` follow the writing direction
 * (`end` is the right edge in a left-to-right page, as Figma draws the Drawer); `bottom` is the sheet,
 * as AppShell's "More" sheet below 640 px.
 */
export type DrawerSide = 'start' | 'end' | 'bottom';
export type DrawerTitleLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Strings the Drawer renders (§9.3 rule 7, §16.4). `close` is the accessible name of the default
 * `Drawer.Close` (an IconButton showing the close glyph), set through that part's `labels`.
 * Engine-owned with React Aria (not overridable): `dismiss`, the visually hidden "Dismiss" button
 * rendered inside the drawer.
 */
export interface DrawerLabels {
  /** @default 'Close' */
  close: string;
  dismiss: string;
}

export interface DrawerRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  /**
   * Where focus goes when the drawer closes (§12.2 Focus return), as `Dialog.Root`'s: the trigger,
   * else the trigger of the overlay it was opened from, else `<body>` with a development warning; an
   * element ref or a function returning one goes first; `false` leaves focus alone.
   * @default true
   */
  returnFocus?: ReturnFocusTarget;
  children: ReactNode;
}

export interface DrawerTriggerState {
  open: boolean;
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface DrawerPopupState {
  entering: boolean;
  exiting: boolean;
}

export interface DrawerCloseState {
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface DrawerTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Must render a `<button>`, for example `render={<Button>View order</Button>}`. */
  render?: RenderProp<DrawerTriggerState>;
  children?: ReactNode;
}

export interface DrawerPopupProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'role'> {
  /** The edge it slides in from. @default 'end' */
  side?: DrawerSide;
  /** The scrim element. Defaults to on for the root modal and off when opened from another modal. */
  backdrop?: boolean;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  children: ReactNode;
}

export interface DrawerHeaderProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DrawerTitleProps extends Omit<ComponentPropsWithRef<'h2'>, 'id'> {
  /** @default 2 */
  level?: DrawerTitleLevel;
  render?: RenderProp<Record<string, never>>;
}

export interface DrawerDescriptionProps extends Omit<ComponentPropsWithRef<'p'>, 'id'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DrawerBodyProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DrawerFooterProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface DrawerCloseProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Must render a `<button>`, for example `render={<Button>Cancel</Button>}`. With neither `render`
   * nor `children`, the part is an IconButton showing the close glyph, named by `labels.close`, which
   * sits in the header's end corner when it is a direct child of `Drawer.Popup`.
   */
  render?: RenderProp<DrawerCloseState>;
  /** Text content, rendered in a plain `<button>`; leave it out for the default IconButton. */
  children?: ReactNode;
  /** The default IconButton's accessible name; an `aria-label` you pass wins. */
  labels?: Partial<Pick<DrawerLabels, 'close'>>;
}

/**
 * What every Drawer adapter implements: the Dialog's seam, member for member (the leaf always passes
 * `role="dialog"`), and the engine's writing direction, from which the leaf resolves `side` to the
 * physical edge it writes as `data-side` (§8.3). The react-aria adapter re-exports the Dialog
 * adapter, so one modal core serves both (§4.1 L4).
 */
export interface DrawerEngine {
  Root: DialogEngine['Root'];
  Trigger: DialogEngine['Trigger'];
  Popup: DialogEngine['Popup'];
  Title: DialogEngine['Title'];
  Description: DialogEngine['Description'];
  Close: DialogEngine['Close'];
  /** The writing direction the engine lays its popups out in: the scope locale's. */
  useDirection(): 'ltr' | 'rtl';
}

// Public, engine-free types and the TooltipEngine interface (ARCHITECTURE.md §9.2, §12.3). NO directive.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { Align, Side } from '../contracts/state';
import type { EnginePart } from '../_internal/engine-part';

export type { OpenReason };

/** Logical side; the resolved physical side is `data-side` on the popup. */
export type TooltipSide = 'top' | 'bottom' | 'start' | 'end';

/** Strings the engine renders (§9.3 rule 7): React Aria's Tooltip renders none. */
export type TooltipLabels = Record<string, never>;

export interface TooltipRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  /** Hover delay before opening, in ms (Figma: 400). Keyboard focus opens immediately. @default 400 */
  delay?: number;
  disabled?: boolean;
  children: ReactNode;
}

export interface TooltipTriggerState {
  open: boolean;
}

export interface TooltipPopupState {
  entering: boolean;
  exiting: boolean;
  side: Side;
}

export interface TooltipTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Any focusable element, for example `render={<Button variant="tertiary">Save</Button>}`. */
  render?: RenderProp<TooltipTriggerState>;
  children?: ReactNode;
}

export interface TooltipPopupProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'role'> {
  /** @default 'top' */
  side?: TooltipSide;
  /** @default 'center' */
  align?: Align;
  /** Distance from the trigger in px. @default 8 */
  sideOffset?: number;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  children: ReactNode;
}

/** What every Tooltip adapter implements (the RAC components adapter now, a hooks adapter in v0.2). */
export interface TooltipEngine {
  Root(p: Omit<TooltipRootProps, 'delay'> & { delay: number }): ReactElement;
  Trigger(p: EnginePart<'button', TooltipTriggerState>): ReactElement;
  Popup(
    p: EnginePart<'div', TooltipPopupState, 'role'> & {
      side: TooltipSide;
      align: Align;
      sideOffset: number;
      container?: Element | null | undefined;
    },
  ): ReactElement;
}

// Public IconButton types (ARCHITECTURE.md §10.2). NO directive: the shell, the element and the
// tooltip leaf all read them, and nothing here imports a module with code.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { RenderProp } from '../contracts/render';
import type { Align } from '../contracts/state';
import type { ButtonVariant, ControlSize } from '../augment';
import type { TooltipSide } from '../tooltip/tooltip.contract';

export interface IconButtonState {
  variant: ButtonVariant;
  size: ControlSize;
  pending: boolean;
  disabled: boolean;
  /** `true` or `false` for a toggle (`pressed` given); `undefined` for a plain action. */
  pressed: boolean | undefined;
}

/** Where the tooltip goes and when it opens; `tooltip={{ side: 'bottom' }}`. */
export interface IconButtonTooltipOptions {
  /** @default 'top' */
  side?: TooltipSide;
  /** @default 'center' */
  align?: Align;
  /** Hover delay in ms; keyboard focus opens it at once. @default 400 */
  delay?: number;
}

export interface IconButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'aria-label' | 'aria-pressed'
> {
  /**
   * The action, in words: the button's accessible name (`aria-label`) and the tooltip text. Required,
   * because the glyph alone names nothing. Keep it constant for a toggle (`"Bold"`, not "Bold on");
   * `pressed` carries the state. An `aria-labelledby` you pass names the button instead, and the
   * tooltip still shows `label`.
   */
  label: string;
  /** The glyph, decorative (`aria-hidden`): 16 px at `sm`, 20 px at `md`, 24 px at `lg`. */
  icon: ReactNode;
  /** Figma "Variant". @default 'secondary' */
  variant?: ButtonVariant;
  /** 32 / 40 / 48 px square. @default 'md' */
  size?: ControlSize;
  /**
   * Makes it a toggle button: `aria-pressed` is written as given, so `false` is an unpressed toggle.
   * Leave it out for a plain action.
   */
  pressed?: boolean;
  /**
   * An action is in flight: the spinner replaces the glyph, and the button stays focusable with
   * `aria-disabled` and swallows clicks.
   * @default false
   */
  pending?: boolean;
  /** Replaces the internal spinner glyph. */
  pendingIndicator?: ReactNode;
  /**
   * Pairs the button with a Tooltip that shows `label` ("Always paired with a tooltip that names the
   * action", Figma). The tooltip is a client leaf; `false` keeps the button server-safe with no client
   * code. Pass options to place it.
   * @default true
   */
  tooltip?: boolean | IconButtonTooltipOptions;
  /**
   * A keyboard shortcut shown in the tooltip after the label, with `Kbd` (`"mod+b"` is ⌘B on Apple
   * platforms, Ctrl+B elsewhere). The app implements the shortcut; the button announces it through
   * `aria-keyshortcuts` (`"Meta+B Control+B"`), with or without the tooltip.
   */
  shortcut?: string;
  /** Composition, for example `render={<Link href="/settings" />}`. */
  render?: RenderProp<IconButtonState>;
}

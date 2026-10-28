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
  /** The button's emphasis, as Button's `variant`. @default 'secondary' */
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
   * `aria-disabled` and swallows clicks. The spinner turns once per `--nz-duration-spin` and stops
   * under Reduced motion; an icon-only button has no room for the "Loading…" text Button shows then,
   * so show the progress in words next to it when the wait is long (for example a status line).
   * @default false
   */
  pending?: boolean;
  /** Replaces the internal spinner glyph. */
  pendingIndicator?: ReactNode;
  /**
   * Pairs the button with a Tooltip that shows `label`, so a sighted user can read what the
   * glyph does. The tooltip is a client leaf; `false` renders the button with no client code
   * running. Pass options to place it. Where visible text already names the action and the page
   * should ship no JavaScript for the button, use `IconButtonStatic`: under Turbopack and `next dev`
   * this module's import of the leaf ships the tooltip chain even with `tooltip={false}`.
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

/**
 * IconButtonStatic's props: IconButton's, without the tooltip. `aria-label` is always required; an
 * `aria-labelledby` pointing at visible text may be added, and then names the button, with
 * `aria-label` as the fallback.
 */
export interface IconButtonStaticProps extends Omit<
  IconButtonProps,
  'label' | 'tooltip' | 'shortcut'
> {
  /** The action, in words: the button's accessible name. Required, because the glyph alone names nothing. */
  'aria-label': string;
  /** IconButtonStatic has no tooltip and no `label`: name it with `aria-label`. */
  label?: never;
  /** IconButtonStatic has no tooltip: use `IconButton` for one. */
  tooltip?: never;
  /**
   * IconButtonStatic has no tooltip to show a shortcut in: pass `aria-keyshortcuts`
   * (`"Meta+B Control+B"`) to announce one, or use `IconButton` with `shortcut`.
   */
  shortcut?: never;
}

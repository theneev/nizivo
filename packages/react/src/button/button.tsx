// NO directive: zero client JS under RSC (ARCHITECTURE.md §10.2).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { SpinnerGlyph } from '../_internal/glyphs';
import type { ButtonVariant, ControlSize } from '../augment';

export interface ButtonState {
  variant: ButtonVariant;
  size: ControlSize;
  pending: boolean;
  disabled: boolean;
}

/** Button's own strings (§16.4): serialisable, English defaults. */
export interface ButtonLabels {
  /**
   * The text a pending button shows next to its label under Reduced motion, where the spinner stops
   * (Figma: "Spinner and skeleton loops stop; a text label shows").
   * @default 'Loading…'
   */
  pending: string;
}

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Figma "Variant". One primary per view; secondary for everything else; tertiary inside dense rows.
   * @default 'secondary'
   */
  variant?: ButtonVariant;
  /** 32 / 40 / 48 px. @default 'md' */
  size?: ControlSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /**
   * An action is in flight: the spinner replaces the leading icon, the label stays, and the button
   * stays focusable with `aria-disabled` and swallows clicks. The spinner turns once per
   * `--nz-duration-spin`; under Reduced motion it stops and `labels.pending` ("Loading…") shows after
   * the label. That text is visual only: the accessible name stays the label.
   * @default false
   */
  pending?: boolean;
  /** Replaces the internal spinner glyph. */
  pendingIndicator?: ReactNode;
  /** Fills the width of its container. @default false */
  fullWidth?: boolean;
  /** Composition, for example `render={<Link href="/orders" />}`. */
  render?: RenderProp<ButtonState>;
  /**
   * Overrides Button's strings, for example `labels={{ pending: 'Wird geladen…' }}`; `pending: ''`
   * shows no text. Translation is per instance (no global labels in 0.1.0): an app wraps Button once to
   * pass its own.
   */
  labels?: Partial<ButtonLabels>;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  pending = false,
  pendingIndicator,
  fullWidth = false,
  disabled = false,
  type,
  render,
  className,
  onClick,
  labels,
  children,
  ...rest
}: ButtonProps): ReactElement {
  // Only a real <button> may receive `type` and `disabled`.
  const native = render === undefined;
  const empty = children == null && leadingIcon == null && trailingIcon == null && !pending;
  return renderElement(
    'button',
    render,
    { variant, size, pending, disabled },
    {
      'data-slot': 'button',
      'data-variant': variant,
      'data-size': size,
      'data-pending': pending ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-full-width': fullWidth ? '' : undefined,
      // After our data-*: when a part renders this Button (Dialog.Trigger render={<Button />}), the
      // element is that part, so its data-slot, data-size and state attributes win.
      ...rest,
      className: cx('nz-button nz-hit-target', className),
      // A pending submit button must not resubmit.
      type: native ? (pending ? 'button' : (type ?? 'button')) : undefined,
      disabled: native && disabled && !pending ? true : undefined,
      // Pending stays focusable (gap report B §C2.3).
      'aria-disabled': pending || (!native && disabled) ? true : undefined,
      // A handler only exists when a client component rendered us.
      onClick: pending && onClick ? swallow : onClick,
      // Nothing to show: no children at all. Under RSC a part that renders this Button (for example
      // Select.Trigger render={<Button />}) receives it as a host element, and an empty label span
      // there would replace the part's own children.
      children: empty ? undefined : (
        <>
          {pending ? (
            <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">
              {pendingIndicator ?? <SpinnerGlyph />}
            </span>
          ) : (
            leadingIcon != null && (
              <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">
                {leadingIcon}
              </span>
            )
          )}
          <span className="nz-button-label" data-slot="button-label">
            {children}
          </span>
          {pending && labels?.pending !== '' && (
            // Shown only under Reduced motion (button.css), in every render: the markup does not
            // depend on the motion preference (§13.2 rule 3). Hidden from assistive technology like
            // the spinner it stands in for, so the name stays the label and only aria-disabled
            // changes.
            <span
              className="nz-button-pending-label"
              data-slot="button-pending-label"
              aria-hidden="true"
            >
              {labels?.pending ?? 'Loading…'}
            </span>
          )}
          {trailingIcon != null && (
            <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">
              {trailingIcon}
            </span>
          )}
        </>
      ),
    },
  );
}

function swallow(event: { preventDefault(): void }): void {
  event.preventDefault();
}

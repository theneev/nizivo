'use client';
// The Alert's dismiss leaf: the only part of an Alert that hydrates (ARCHITECTURE.md §9.5, "split").
import type { ComponentPropsWithRef, MouseEvent, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Glyph } from '../_internal/glyphs';

/** Strings this part renders (§16.4). */
export interface AlertDismissLabels {
  /** The button's accessible name. @default 'Dismiss' */
  dismiss: string;
}

export interface AlertDismissProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Called with no arguments, so a Server Component can pass a Server Action. The Alert does not hide
   * itself: the caller stops rendering it.
   */
  onDismiss?: () => void;
  labels?: Partial<AlertDismissLabels>;
  /** The close glyph, decorative. Defaults to the internal `close` glyph (Lucide's `x`). */
  children?: ReactNode;
  /** Composition, for example an IconButton; it must render a `<button>`. */
  render?: RenderProp<Record<string, never>>;
}

export function AlertDismiss({
  onDismiss,
  labels,
  'aria-label': ariaLabel,
  type,
  render,
  className,
  onClick,
  children,
  ...rest
}: AlertDismissProps): ReactElement {
  return renderElement(
    'button',
    render,
    {},
    {
      'data-slot': 'alert-dismiss',
      ...rest,
      // Only a real <button> may receive `type`.
      type: render === undefined ? (type ?? 'button') : undefined,
      'aria-label': ariaLabel ?? labels?.dismiss ?? 'Dismiss',
      className: cx('nz-alert-dismiss nz-hit-target', className),
      // Consumer first; a prevented click does not dismiss.
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) onDismiss?.();
      },
      children: (
        <span className="nz-alert-dismiss-icon" data-slot="alert-dismiss-icon" aria-hidden="true">
          {children ?? <Glyph name="close" />}
        </span>
      ),
    },
  );
}

'use client';
// The Banner's dismiss leaf: the only part of a Banner that hydrates (ARCHITECTURE.md §9.5, "split").
import type { ComponentPropsWithRef, MouseEvent, ReactElement, ReactNode } from 'react';
import { useLabels } from '../config/config.client';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CloseGlyph } from '../_internal/glyphs';

/** Strings this part renders (§16.4). */
export interface BannerDismissLabels {
  /** The button's accessible name. @default 'Dismiss' */
  dismiss: string;
}

export interface BannerDismissProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Called with no arguments, so a Server Component can pass a Server Action. The Banner does not hide
   * itself: the caller stops rendering it.
   */
  onDismiss?: () => void;
  labels?: Partial<BannerDismissLabels>;
  /** The close glyph, decorative. Defaults to the internal `close` glyph (Lucide's `x`). */
  children?: ReactNode;
  /**
   * Your element in place of the default IconButton; it must render a `<button>`. A plain element
   * keeps its own look. An IconButton, for example
   * `render={<IconButton icon={<X />} label="Dismiss" variant="tertiary" />}` to add its
   * tooltip, keeps its variant and size, and in a Banner takes the icon/secondary glyph colour, as a
   * composed IconButton does in `Dialog.Close`.
   */
  render?: RenderProp<Record<string, never>>;
}

// AlertDismiss's markup (alert-dismiss.client.tsx), the IconButton element written out, at `md`.
/**
 * With no `render`, an IconButton (tertiary, `md`: a 20 px glyph in a 40 px target,
 * the height of the Banner's action) with no tooltip, as `Dialog.Close` does.
 */
export function BannerDismiss({
  onDismiss,
  labels: labelsProp,
  'aria-label': ariaLabel,
  type,
  render,
  className,
  onClick,
  children,
  ...rest
}: BannerDismissProps): ReactElement {
  const labels = useLabels('bannerDismiss', labelsProp);
  const own = render === undefined;
  return renderElement(
    'button',
    render,
    {},
    {
      'data-slot': 'banner-dismiss',
      // Only the default is an IconButton. data-variant and data-size are part-owned (they would win
      // over the element's), so under `render` a composed IconButton keeps its own.
      ...(own && { 'data-variant': 'tertiary', 'data-size': 'md' }),
      ...rest,
      // Only a real <button> may receive `type`.
      type: own ? (type ?? 'button') : undefined,
      'aria-label': ariaLabel ?? labels?.dismiss ?? 'Dismiss',
      className: cx('nz-banner-dismiss', own && 'nz-icon-button', 'nz-hit-target', className),
      // Consumer first; a prevented click does not dismiss.
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) onDismiss?.();
      },
      children: (
        <span className="nz-icon-button-icon" data-slot="icon-button-icon" aria-hidden="true">
          {children ?? <CloseGlyph />}
        </span>
      ),
    },
  );
}

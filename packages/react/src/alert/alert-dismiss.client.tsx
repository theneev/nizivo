'use client';
// The Alert's dismiss leaf: the only part of an Alert that hydrates (ARCHITECTURE.md §9.5, "split").
import type { ComponentPropsWithRef, MouseEvent, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CloseGlyph } from '../_internal/glyphs';

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
  /**
   * Your element in place of the default IconButton; it must render a `<button>`. A plain element
   * keeps its own look. An IconButton, for example
   * `render={<IconButton icon={<X />} label="Dismiss" variant="tertiary" size="sm" />}` to add its
   * tooltip, keeps its variant and size, and in an Alert takes the dismiss slot's placement (made for
   * `sm`) and icon/secondary glyph colour, as a composed IconButton does in `Dialog.Close`.
   */
  render?: RenderProp<Record<string, never>>;
}

/**
 * With no `render`, an IconButton (tertiary, `sm`: the 16 px glyph Figma draws, in a 32 px target)
 * with no tooltip, as `Dialog.Close` does (week 6): its markup is the IconButton element's
 * (`iconButtonElement` in icon-button.tsx), written out, because importing that module brings in the
 * IconButton's tooltip leaf and the Tooltip chain (D-aa), and this leaf must stay the Alert's only
 * client module. A unit test compares the two.
 */
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
  const own = render === undefined;
  return renderElement(
    'button',
    render,
    {},
    {
      'data-slot': 'alert-dismiss',
      // Only the default is an IconButton. data-variant and data-size are part-owned (they would win
      // over the element's), so under `render` a composed IconButton keeps its own.
      ...(own && { 'data-variant': 'tertiary', 'data-size': 'sm' }),
      ...rest,
      // Only a real <button> may receive `type`.
      type: own ? (type ?? 'button') : undefined,
      'aria-label': ariaLabel ?? labels?.dismiss ?? 'Dismiss',
      className: cx('nz-alert-dismiss', own && 'nz-icon-button', 'nz-hit-target', className),
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

// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CircleXGlyph } from '../_internal/glyphs';

export interface InlineErrorProps extends ComponentPropsWithRef<'div'> {
  /**
   * The error mark, decorative: the message carries the meaning, and the mark keeps the error from
   * being colour-only (§15.1). Defaults to the internal `circle-x` glyph; pass your icon set's glyph
   * to replace it.
   */
  icon?: ReactNode;
  /** A recovery control after the message, for example `<Button size="sm">Retry</Button>` (§16.5). */
  action?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

/** One error look for fields and data widgets: icon + text, never colour alone. Not a live region. */
export function InlineError({
  icon,
  action,
  render,
  className,
  children,
  ...rest
}: InlineErrorProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'inline-error',
      ...rest,
      className: cx('nz-inline-error', className),
      children: (
        <>
          <span className="nz-inline-error-icon" data-slot="inline-error-icon" aria-hidden="true">
            {icon ?? <CircleXGlyph />}
          </span>
          <span className="nz-inline-error-message" data-slot="inline-error-message">
            {children}
          </span>
          {action != null && (
            <span className="nz-inline-error-action" data-slot="inline-error-action">
              {action}
            </span>
          )}
        </>
      ),
    },
  );
}

// NO directive: the server-safe Alert shell (ARCHITECTURE.md §9.5, "split"). The dismiss control is the
// AlertDismiss client leaf, passed in `dismiss`, so an Alert without one ships no client JS.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** Figma "Tone". */
export type AlertTone = 'info' | 'success' | 'warning' | 'critical';

export interface AlertState {
  tone: AlertTone;
}

export interface AlertProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** @default 'info' */
  tone?: AlertTone;
  /** One line, Label/M Strong. The description is `children`. */
  title?: ReactNode;
  /** Decorative tone glyph, for example `<CircleX />` for `critical`; the text carries the meaning. */
  icon?: ReactNode;
  /** Controls under the text, for example `<Button size="sm">Retry</Button>`. */
  action?: ReactNode;
  /** `<AlertDismiss onDismiss={…}>…</AlertDismiss>`; leave it out for an alert that cannot be dismissed. */
  dismiss?: ReactNode;
  /**
   * There is no live role by default: an alert present on page load must not interrupt. Pass
   * `role="status"` or `role="alert"` for one injected after a user action.
   */
  role?: ComponentPropsWithRef<'div'>['role'];
  render?: RenderProp<AlertState>;
}

export function Alert({
  tone = 'info',
  title,
  icon,
  action,
  dismiss,
  render,
  className,
  children,
  ...rest
}: AlertProps): ReactElement {
  return renderElement(
    'div',
    render,
    { tone },
    {
      'data-slot': 'alert',
      'data-tone': tone,
      ...rest,
      className: cx('nz-alert', className),
      children: (
        <>
          {icon != null && (
            <span className="nz-alert-icon" data-slot="alert-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="nz-alert-content" data-slot="alert-content">
            {title != null && (
              <div className="nz-alert-title" data-slot="alert-title">
                {title}
              </div>
            )}
            {/* `{failed && 'Card was declined.'}` must not leave an empty description */}
            {children != null && children !== false && children !== '' && (
              <div className="nz-alert-description" data-slot="alert-description">
                {children}
              </div>
            )}
            {action != null && (
              <div className="nz-alert-action" data-slot="alert-action">
                {action}
              </div>
            )}
          </div>
          {dismiss}
        </>
      ),
    },
  );
}

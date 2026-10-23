// NO directive: the server-safe part of @nizivo/react/form (ARCHITECTURE.md §16.1, gap report A §2.4,
// §2.5). FormMessage is the form-level message: a live container present in the server HTML, empty
// or not, so a message that arrives later is announced (WCAG technique ARIA19). Form and SubmitButton
// are the client leaves (form.client.tsx, submit-button.client.tsx), exported flat beside it.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { presented } from '../_internal/field';
import { Alert, type AlertTone } from '../alert/alert';

/** Alert's tones. `critical` is a `role="alert"` container; the others are `role="status"`. */
export type FormMessageTone = AlertTone;

export interface FormMessageState {
  tone: FormMessageTone;
}

export interface FormMessageProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'role'> {
  /**
   * `critical` for a failure the user must act on (network, permission, conflict): `role="alert"`.
   * `success`, `info` and `warning` are `role="status"`, read when the reader is idle.
   * @default 'critical'
   */
  tone?: FormMessageTone;
  /** One line above the message, as Alert's `title`. */
  title?: ReactNode;
  /** Decorative tone glyph, as Alert's `icon`; the text carries the meaning. */
  icon?: ReactNode;
  /** A control under the message, for example `<Button size="sm">Retry</Button>`. */
  action?: ReactNode;
  /** Composition of the live container. */
  render?: RenderProp<FormMessageState>;
  /**
   * The message. `null`, `false` and `''` render nothing inside the container, which stays in the
   * page so the next message is announced: render FormMessage always, and change only this.
   */
  children?: ReactNode;
}

/**
 * The form-level message: a live container that is always rendered, with an Alert inside it while
 * there is a message. Field errors belong to each Field (`error`, or Form's `errors`), not here.
 */
export function FormMessage({
  tone = 'critical',
  title,
  icon,
  action,
  render,
  className,
  children,
  ...rest
}: FormMessageProps): ReactElement {
  const shown = presented(children) || presented(title);
  return renderElement(
    'div',
    render,
    { tone },
    {
      'data-slot': 'form-message',
      'data-tone': tone,
      ...rest,
      className: cx('nz-form-message', className),
      // In the server HTML from the first render, so a message added later is announced (ARIA19)
      role: tone === 'critical' ? 'alert' : 'status',
      children: shown ? (
        <Alert tone={tone} title={title} icon={icon} action={action}>
          {children}
        </Alert>
      ) : undefined,
    },
  );
}

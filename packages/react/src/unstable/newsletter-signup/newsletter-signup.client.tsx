'use client';
// NewsletterSignup (ARCHITECTURE.md §21.4a; D-dp; Figma's Newsletter Signup 7395:100): an email
// capture for releases and content. A real form: a visible "Email" label (never a placeholder
// alone), an email input with autocomplete, the browser's own validation shown inline by Field, a
// Subscribe button that is pending while `onSubscribe` runs, and a success message announced in a
// polite live region. If `onSubscribe` throws, its message shows under the field.
// UNSTABLE: v0.6 is new and unreviewed.
import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type JSX,
  type ReactNode,
} from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { Button } from '../../button/index';
import { Field } from '../../field/index';
import { Input } from '../../input/index';

/** NewsletterSignup's own strings (§16.4): serialisable, English defaults. */
export interface NewsletterSignupLabels {
  /** @default 'Email' */
  email: string;
  /** @default 'Subscribe' */
  subscribe: string;
  /** Announced after a signup. @default 'Thanks — check your inbox to confirm.' */
  success: string;
  /** When the address is missing. @default 'Enter your email address.' */
  missing: string;
  /** When the address is not one. @default 'Enter an email address like name@example.com.' */
  invalid: string;
}

export interface NewsletterSignupState {
  status: 'idle' | 'pending' | 'done';
}

export interface NewsletterSignupProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'title' | 'children' | 'onSubmit'
> {
  title: ReactNode;
  /** The title's level. @default 3 */
  headingLevel?: 2 | 3 | 4;
  /** What they get: "New components, token changes and accessibility fixes. No spam." */
  description?: ReactNode;
  /** Under the form: "Unsubscribe any time. We never share your email." */
  note?: ReactNode;
  /** Subscribes the address; a thrown Error's message shows under the field. */
  onSubscribe?: (email: string) => void | Promise<void>;
  /** @default 'e.g. name@example.com' */
  placeholder?: string;
  labels?: Partial<NewsletterSignupLabels>;
  /** Must render a `<section>`. */
  render?: RenderProp<NewsletterSignupState>;
}

export function NewsletterSignup({
  title,
  headingLevel = 3,
  description,
  note,
  onSubscribe,
  placeholder = 'e.g. name@example.com',
  labels: labelsProp,
  render,
  className,
  ...rest
}: NewsletterSignupProps): JSX.Element {
  const labels = useLabels('newsletterSignup', labelsProp);
  const [status, setStatus] = useState<NewsletterSignupState['status']>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get('email');
    if (typeof email !== 'string' || status === 'pending') return;
    setError(undefined);
    setStatus('pending');
    try {
      await onSubscribe?.(email);
      setStatus('done');
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
      setStatus('idle');
    }
  }

  return renderElement(
    'section',
    render,
    { status },
    {
      'aria-labelledby': titleId,
      'data-slot': 'newsletter-signup',
      ...rest,
      className: cx('nz-newsletter-signup', className),
      children: (
        <>
          <Heading className="nz-newsletter-signup-title" id={titleId}>
            {title}
          </Heading>
          {description != null && <p className="nz-newsletter-signup-description">{description}</p>}
          <form
            className="nz-newsletter-signup-form"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <Field
              className="nz-newsletter-signup-field"
              label={labels?.email ?? 'Email'}
              required
              {...(error === undefined ? {} : { error })}
              messages={{
                valueMissing: labels?.missing ?? 'Enter your email address.',
                typeMismatch: labels?.invalid ?? 'Enter an email address like name@example.com.',
              }}
            >
              <Input name="email" type="email" autoComplete="email" placeholder={placeholder} />
            </Field>
            <Button type="submit" variant="primary" pending={status === 'pending'}>
              {labels?.subscribe ?? 'Subscribe'}
            </Button>
          </form>
          <p className="nz-newsletter-signup-status" aria-live="polite">
            {status === 'done' ? (labels?.success ?? 'Thanks — check your inbox to confirm.') : ''}
          </p>
          {note != null && <p className="nz-newsletter-signup-note">{note}</p>}
        </>
      ),
    },
  );
}

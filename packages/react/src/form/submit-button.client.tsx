'use client';
// SubmitButton: Button with `type="submit"` that is `pending` while its form's action runs (React's
// `useFormStatus`; ARCHITECTURE.md §16.1, gap report A §2.4). A client leaf of its own, so Button
// stays server-safe. Pending is Button's: the spinner, `aria-disabled`, `data-pending`, focus kept,
// and no second submit (a pending Button is `type="button"`); never `disabled`, which would drop
// focus and silence a screen reader.
import type { ReactElement } from 'react';
import { useFormStatus } from 'react-dom';
import type { ButtonVariant } from '../augment';
import { Button, type ButtonProps } from '../button/button';

export interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
  /**
   * The form's main action, so `primary`; Button's other variants are accepted.
   * @default 'primary'
   */
  variant?: ButtonVariant;
  /**
   * Pending even when the form's action is not running, for example while a client handler awaits.
   * The form's own status is read for you: only an action passed as a function (`<form action={fn}>`
   * or Form's) reports one, never a URL.
   * @default false
   */
  pending?: boolean;
}

export function SubmitButton({
  variant = 'primary',
  pending = false,
  ...rest
}: SubmitButtonProps): ReactElement {
  const status = useFormStatus();
  return <Button {...rest} variant={variant} type="submit" pending={pending || status.pending} />;
}

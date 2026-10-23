import type { JSX } from 'react';
import { Field } from '../field/index';
import { PasswordInput } from './index';

/** Signing in: the toggle shows the password, and a submit hides it again. */
export function PasswordInputExample(): JSX.Element {
  return (
    <form style={{ maxInlineSize: 320 }}>
      <Field name="password" label="Password" required>
        <PasswordInput />
      </Field>
    </form>
  );
}

/** Choosing a password: `new-password`, so a password manager offers to generate one. */
export function PasswordInputNewExample(): JSX.Element {
  return (
    <form style={{ maxInlineSize: 320 }}>
      <Field
        name="new-password"
        label="New password"
        description="At least 12 characters."
        required
        messages={{
          valueMissing: 'Enter a new password.',
          tooShort: 'Use at least 12 characters.',
        }}
      >
        <PasswordInput autoComplete="new-password" minLength={12} />
      </Field>
    </form>
  );
}

/** An error from the server, sizes, and disabled. */
export function PasswordInputStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 320 }}>
      <Field label="Password" error="That password is not right. Try again or reset it.">
        <PasswordInput defaultValue="hunter2" />
      </Field>
      <PasswordInput size="sm" aria-label="Small" />
      <PasswordInput size="lg" aria-label="Large" />
      <Field label="Password" disabled>
        <PasswordInput defaultValue="hunter2" />
      </Field>
    </div>
  );
}

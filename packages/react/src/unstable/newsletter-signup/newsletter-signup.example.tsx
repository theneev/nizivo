import type { JSX } from 'react';
import { NewsletterSignup } from './index';

/** A signup: what people get, a visible Email label, and a note on what happens next. */
export function NewsletterSignupExample(): JSX.Element {
  return (
    <NewsletterSignup
      title="Release notes, monthly"
      description="New components, token changes and accessibility fixes. No spam."
      note="Unsubscribe any time. We never share your email."
    />
  );
}

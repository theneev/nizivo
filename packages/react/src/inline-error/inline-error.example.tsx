import type { JSX } from 'react';
import { Button } from '../button/index';
import { InlineError } from './index';

/** Stands in for an `@nizivo/icons` glyph (Lucide circle-x). */
function ErrorMark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export function InlineErrorExample(): JSX.Element {
  return (
    <div>
      <InlineError icon={<ErrorMark />}>Enter a price above zero.</InlineError>
      <InlineError
        icon={<ErrorMark />}
        action={
          <Button size="sm" variant="tertiary">
            Retry
          </Button>
        }
      >
        Couldn’t load revenue.
      </InlineError>
    </div>
  );
}

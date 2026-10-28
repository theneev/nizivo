import type { JSX } from 'react';
import { FeedbackBar } from './index';

const REASONS = ['Not accurate', 'Not helpful', 'Too long', 'Something else'];

/** Three states: not voted, a thumbs up, and a thumbs down with its reasons. */
export function FeedbackBarExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <FeedbackBar reasons={REASONS} />
      <FeedbackBar defaultValue="up" reasons={REASONS} />
      <FeedbackBar defaultValue="down" reasons={REASONS} />
    </div>
  );
}

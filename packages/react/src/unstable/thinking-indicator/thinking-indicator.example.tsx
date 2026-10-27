import type { JSX } from 'react';
import { ThinkingIndicator } from './index';

/** Before the first word, and naming the step when the assistant knows it. */
export function ThinkingIndicatorExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <ThinkingIndicator />
      <ThinkingIndicator>Reading last week’s orders…</ThinkingIndicator>
    </div>
  );
}

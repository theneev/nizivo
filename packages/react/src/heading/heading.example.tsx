import type { JSX } from 'react';
import { Heading } from './index';

export function HeadingExample(): JSX.Element {
  return (
    <div>
      <Heading level={1}>Good morning, Asha</Heading>
      {/* The outline level and the look are independent: an <h2> drawn as Heading/H4. */}
      <Heading level={2} variant="heading-h4">
        Revenue
      </Heading>
      <Heading level={3} tone="secondary">
        No orders yet
      </Heading>
    </div>
  );
}

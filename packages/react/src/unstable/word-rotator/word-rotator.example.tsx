import type { JSX } from 'react';
import { WordRotator } from './index';

/** Figma's headline: the keyword turns over; a screen reader hears all three words once. */
export function WordRotatorExample(): JSX.Element {
  return (
    <h2 style={{ margin: 0 }}>
      Design for <WordRotator words={['dashboards', 'commerce', 'websites']} />
    </h2>
  );
}

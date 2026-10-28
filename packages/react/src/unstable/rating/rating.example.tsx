import type { JSX } from 'react';
import { Rating } from './index';

/** A rating: the stars, the score and the count, read as one sentence. */
export function RatingExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Rating value={4.8} count={1208} />
      <Rating value={3} />
    </div>
  );
}

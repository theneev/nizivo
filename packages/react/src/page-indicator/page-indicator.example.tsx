import type { JSX } from 'react';
import { PageIndicator } from './index';

/** Dots under a product's photos, and a "2 / 9" chip for a longer set. */
export function PageIndicatorExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <PageIndicator count={4} current={1} />
      <PageIndicator count={9} current={2} variant="fraction" />
    </div>
  );
}

/** Over a photo (tone="media"): white dots, and a dark chip with white text. */
export function PageIndicatorMediaExample(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        inlineSize: 320,
        blockSize: 200,
        padding: 12,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #c9b79c, #8a6e4b)',
      }}
    >
      <PageIndicator count={4} current={3} tone="media" />
      <PageIndicator count={4} current={3} variant="fraction" tone="media" />
    </div>
  );
}

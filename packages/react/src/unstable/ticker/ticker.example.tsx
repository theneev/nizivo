import type { JSX } from 'react';
import { Ticker } from './index';

/** A strip of features; it pauses under the pointer and stands still under Reduced motion. */
export function TickerExample(): JSX.Element {
  return (
    <div style={{ inlineSize: 720 }}>
      <Ticker
        items={[
          'Light & Dark',
          'WCAG 2.2 AA',
          'Reduced motion',
          '1 px borders',
          '2 px focus ring',
          'Commerce kit',
          'Social kit',
        ]}
      />
    </div>
  );
}

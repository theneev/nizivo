import type { JSX } from 'react';
import { CountUp } from './index';

/** The server renders each final value; the client counts it up once it is in view. */
export function CountUpExample(): JSX.Element {
  return (
    <div>
      <CountUp
        value={48290}
        format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      />
      <CountUp value={1284} />
      <CountUp value={0.124} format={{ style: 'percent', maximumFractionDigits: 1 }} />
      {/* Starts at 1,000 instead of 0, in German grouping */}
      <CountUp value={12500} from={1000} locale="de-DE" />
    </div>
  );
}

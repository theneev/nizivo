import type { JSX } from 'react';
import { NumberValue } from './index';

export function NumberValueExample(): JSX.Element {
  return (
    <div>
      <NumberValue value={48290} />
      <NumberValue
        value={123307.4}
        format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
      />
      <NumberValue value={0.032} format={{ style: 'percent', maximumFractionDigits: 1 }} />
      <NumberValue value={1284000} format={{ notation: 'compact' }} />
      <NumberValue value={1250} format={{ style: 'currency', currency: 'EUR' }} locale="de-DE" />
    </div>
  );
}

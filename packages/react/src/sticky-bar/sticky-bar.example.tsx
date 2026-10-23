import type { JSX } from 'react';
import { Button } from '../button/index';
import { NumberValue } from '../number-value/index';
import { StickyBar } from './index';

/** The storefront's post view (10): the items and their total, then one action. */
export function StickyBarExample(): JSX.Element {
  return (
    <StickyBar
      summary={
        <>
          <span>2 items</span>
          <NumberValue value={62} format={{ style: 'currency', currency: 'USD' }} />
        </>
      }
    >
      <Button size="lg" variant="primary">
        Add both to bag
      </Button>
    </StickyBar>
  );
}

/** The product screen (10): two actions share the bar. */
export function StickyBarActionsExample(): JSX.Element {
  return (
    <StickyBar>
      <Button size="lg" variant="secondary">
        Buy now
      </Button>
      <Button size="lg" variant="primary">
        Add to bag
      </Button>
    </StickyBar>
  );
}

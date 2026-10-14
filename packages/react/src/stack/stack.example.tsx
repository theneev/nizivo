import type { JSX } from 'react';
import { Stack } from './index';

export function StackExample(): JSX.Element {
  return (
    <Stack gap="4">
      <div>Order #1040</div>
      <div>Paid</div>
      <Stack gap="2" render={<ul />}>
        <li>Stoneware mug</li>
        <li>Linen napkins</li>
      </Stack>
    </Stack>
  );
}

import type { JSX } from 'react';
import { Inline } from '../inline/index';
import { Stack } from '../stack/index';
import { Separator } from './index';

export function SeparatorExample(): JSX.Element {
  return (
    <Stack gap="3">
      <div>Subtotal</div>
      <Separator />
      <div>Total</div>
      <Inline gap="3">
        <span>Edit</span>
        <Separator orientation="vertical" decorative />
        <span>Archive</span>
      </Inline>
    </Stack>
  );
}

import type { JSX } from 'react';
import { Inline } from '../inline/index';
import { Stack } from '../stack/index';
import { Separator } from './index';

/**
 * Decorative is the default (M35): the line between two actions only draws.
 * The rule above the total means something on its own, so it says so with `decorative={false}` and a
 * screen reader hears a separator there.
 */
export function SeparatorExample(): JSX.Element {
  return (
    <Stack gap="3">
      <div>Subtotal</div>
      <Separator decorative={false} />
      <div>Total</div>
      <Inline gap="3">
        <span>Edit</span>
        <Separator orientation="vertical" />
        <span>Archive</span>
      </Inline>
    </Stack>
  );
}

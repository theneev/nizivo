import type { JSX } from 'react';
import { Button } from '../button/index';
import { Inline } from './index';

export function InlineExample(): JSX.Element {
  return (
    <Inline gap="2">
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
    </Inline>
  );
}

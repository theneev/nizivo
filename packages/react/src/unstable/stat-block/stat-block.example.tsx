import type { JSX } from 'react';
import { StatBlock } from './index';

/** A row of headline numbers in a description list, each a real count. */
export function StatBlockExample(): JSX.Element {
  return (
    <dl style={{ display: 'flex', flexWrap: 'wrap', gap: 48, margin: 0 }}>
      <StatBlock value="228" label="colour pairs checked" />
      <StatBlock value="106" label="components" />
      <StatBlock value="1,880" label="icons" />
    </dl>
  );
}

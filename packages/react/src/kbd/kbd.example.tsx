import type { JSX } from 'react';
import { Kbd } from './index';

export function KbdExample(): JSX.Element {
  return (
    <p>
      Search with <Kbd keys="mod+k" />, duplicate with <Kbd keys="mod+shift+d" />, move with{' '}
      <Kbd>↑↓</Kbd> and close with <Kbd keys="esc" />.
    </p>
  );
}

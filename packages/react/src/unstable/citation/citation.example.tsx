import type { JSX } from 'react';
import { Citation } from './index';

/** Numbered sources after the claims they support. */
export function CitationExample(): JSX.Element {
  return (
    <p style={{ margin: 0, maxInlineSize: 420 }}>
      Orders are up 8.1% on last week{' '}
      <Citation number={1} href="#source-1" title="Moss & Kiln sales report" />, mostly from
      wholesale <Citation number={2} href="#source-2" title="Autumn restock: what sold out first" />
      .
    </p>
  );
}

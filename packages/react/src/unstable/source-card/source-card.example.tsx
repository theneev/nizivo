import type { JSX } from 'react';
import { SourceCard } from './index';

/** Figma's two types under an answer: a web page (opens in a new tab) and a file. */
export function SourceCardExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 17.5rem)', gap: 16 }}>
      <SourceCard
        href="https://example.com/autumn-restock"
        domain="mossandkiln.com"
        title="Autumn restock: what sold out first"
        number={1}
      />
      <SourceCard
        href="/files/sales-report.pdf"
        type="file"
        domain="Sales report, October"
        title="Moss & Kiln sales report"
        number={2}
      />
    </div>
  );
}

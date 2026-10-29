// Every component and utility entry, generated from the exports map (lib/catalog.ts).
import type { JSX } from 'react';
import { catalog } from '../lib/catalog';
import { outline } from '../lib/outline';
import { Card, Cards } from './cards';
import { InlineMd } from './inline-md';

export function ComponentIndex({
  kind = 'component',
}: {
  kind?: 'component' | 'utility';
}): JSX.Element {
  return (
    <Cards>
      {catalog()
        .filter((e) => e.kind === kind)
        .map((e) => (
          <Card
            key={e.name}
            title={e.title}
            href={e.url}
            description={<InlineMd text={outline(e).description} plainLinks />}
          />
        ))}
    </Cards>
  );
}

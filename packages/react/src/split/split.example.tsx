import type { JSX } from 'react';
import { Card } from '../card/index';
import { Text } from '../text/index';
import { Split } from './index';

/** 08's Overview: the main column and a 360 px aside; they stack when the row is narrow. */
export function SplitExample(): JSX.Element {
  return (
    <Split.Root>
      <Split.Main>
        <Card.Root>
          <Card.Header>
            <Card.Title>Revenue</Card.Title>
          </Card.Header>
          <Card.Body>
            <Text>The main column takes the rest of the row.</Text>
          </Card.Body>
        </Card.Root>
      </Split.Main>
      <Split.Aside render={<aside aria-label="Goals" />}>
        <Card.Root>
          <Card.Header>
            <Card.Title>Goals</Card.Title>
          </Card.Header>
          <Card.Body>
            <Text>The aside is 360 px wide beside it.</Text>
          </Card.Body>
        </Card.Root>
      </Split.Aside>
    </Split.Root>
  );
}

/** Settings: a 232 px section nav first, then the content. */
export function SplitNarrowExample(): JSX.Element {
  return (
    <Split.Root aside="narrow">
      <Split.Aside render={<nav aria-label="Settings sections" />}>
        <Text>Store details · Payments · Shipping</Text>
      </Split.Aside>
      <Split.Main>
        <Card.Root>
          <Card.Header>
            <Card.Title>Store details</Card.Title>
          </Card.Header>
          <Card.Body>
            <Text>The content column.</Text>
          </Card.Body>
        </Card.Root>
      </Split.Main>
    </Split.Root>
  );
}

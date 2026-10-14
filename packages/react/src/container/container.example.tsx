import type { JSX } from 'react';
import { Container } from './index';

export function ContainerExample(): JSX.Element {
  return (
    <Container render={<main />}>
      <p>Page content, centred, with the responsive page margin.</p>
    </Container>
  );
}

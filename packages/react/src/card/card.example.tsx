import type { JSX } from 'react';
import { Badge } from '../badge/index';
import { Button } from '../button/index';
import { Card } from './index';

export function CardExample(): JSX.Element {
  return (
    <div>
      <Card.Root>
        <Card.Header>
          <Card.Title>Top products</Card.Title>
          <Card.Description>Last 30 days</Card.Description>
          <Card.Action>
            <Button variant="tertiary" size="sm">
              View all
            </Button>
          </Card.Action>
        </Card.Header>
        <Card.Body>
          Stoneware mug <Badge tone="success">In stock</Badge>
        </Card.Body>
        <Card.Footer>
          <Button size="sm">Export</Button>
        </Card.Footer>
      </Card.Root>
      <Card.Root tone="subtle">
        <Card.Title level={2}>Plan</Card.Title>
        <Card.Body>Grow, billed monthly</Card.Body>
      </Card.Root>
      <Card.Root tone="inverse" render={<section aria-label="Tip" />}>
        <Card.Body>Share your store to get your first order.</Card.Body>
      </Card.Root>
    </div>
  );
}

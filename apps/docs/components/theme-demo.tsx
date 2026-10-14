// Nested theme scopes with the real components: a light scope, a dark scope inside it, and an
// inverse Card inside each. Everything resolves through `light-dark()` from the nearest scope
// (ARCHITECTURE.md §7.4); no class or JavaScript is involved.
import type { JSX } from 'react';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Text } from '@nizivo/react/text';

function Panel({ label }: { label: string }): JSX.Element {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{label}</Card.Title>
        <Card.Description>Every token follows the nearest scope</Card.Description>
      </Card.Header>
      <Card.Body>
        <Text>
          Order #1040 <Badge tone="success">Paid</Badge>
        </Text>
      </Card.Body>
      <Card.Footer>
        <Button size="sm" variant="primary">
          Refund
        </Button>
        <Button size="sm">Details</Button>
      </Card.Footer>
    </Card.Root>
  );
}

export function ThemeScopesDemo(): JSX.Element {
  return (
    <div className="not-prose nz-docs-scopes" data-nz-theme="light">
      <Panel label='data-nz-theme="light"' />
      <div data-nz-theme="dark" className="nz-docs-scopes-inner">
        <Panel label='data-nz-theme="dark", nested' />
        <Card.Root tone="inverse">
          <Card.Body>Card tone=&quot;inverse&quot; inside the dark scope: light again.</Card.Body>
        </Card.Root>
      </div>
      <Card.Root tone="inverse">
        <Card.Body>Card tone=&quot;inverse&quot; inside the light scope: dark.</Card.Body>
      </Card.Root>
    </div>
  );
}

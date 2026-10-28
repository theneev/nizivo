// The home page. The composition below is real Nizivo, rendered on the server through the public
// subpaths; none of it is a client component, so it ships no Nizivo JavaScript.
import type { JSX } from 'react';
import Link from 'next/link';
import { Alert } from '@nizivo/react/alert';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Delta } from '@nizivo/react/delta';
import { Inline } from '@nizivo/react/inline';
import { Kbd } from '@nizivo/react/kbd';
import { ProgressBar } from '@nizivo/react/progress-bar';
import { Separator } from '@nizivo/react/separator';
import { Stack } from '@nizivo/react/stack';
import { Text } from '@nizivo/react/text';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { CODE_THEMES } from '../../lib/code';

function Composition(): JSX.Element {
  return (
    <div className="nz-home-composition">
      <Card.Root elevation={1}>
        <Card.Header>
          <Card.Title>Revenue</Card.Title>
          <Card.Description>Last 30 days</Card.Description>
          <Card.Action>
            <Badge tone="success">On track</Badge>
          </Card.Action>
        </Card.Header>
        <Card.Body>
          <Stack gap="3">
            <Inline gap="3">
              <Text variant="numeric-kpi" render={<span />}>
                ₹4,82,190
              </Text>
              <Delta value={0.124} comparison="vs last month" />
            </Inline>
            <ProgressBar label="Monthly goal" value={68} />
          </Stack>
        </Card.Body>
        <Card.Footer>
          <Button size="sm" variant="primary">
            View report
          </Button>
          <Button size="sm" variant="tertiary">
            Export
          </Button>
        </Card.Footer>
      </Card.Root>
      <Stack gap="4">
        <Alert title="Payouts move to daily on Nov 1">No action needed.</Alert>
        <Card.Root tone="inverse" padding="sm">
          <Card.Body>
            <Text>
              Search orders with <Kbd keys="mod+k" />
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root padding="sm">
          <Card.Body>
            <Inline gap="2">
              <Badge tone="success">Paid</Badge>
              <Badge tone="warning">Pending</Badge>
              <Badge tone="info">Partially fulfilled</Badge>
            </Inline>
          </Card.Body>
        </Card.Root>
      </Stack>
    </div>
  );
}

const PRINCIPLES = [
  [
    'Server-first',
    'Server Components by default. Client JavaScript only on interactive leaves; no provider.',
  ],
  [
    'Lightweight',
    'Plain CSS in fixed layers, one small stylesheet per component, zero runtime styling.',
  ],
  [
    'Accessible',
    'Native elements first, React Aria where the platform falls short, a focus floor that survives restyling.',
  ],
  [
    'Token-driven',
    'Light, dark and inverse from one light-dark() value per colour; any subtree can switch.',
  ],
] as const;

export default function HomePage(): JSX.Element {
  return (
    // HomeLayout already renders <main>; this is the skip link's target.
    <div className="nz-home" id="content" tabIndex={-1}>
      <section className="nz-home-hero">
        <p className="nz-home-eyebrow">Open source · Apache-2.0 · Pre-alpha</p>
        <h1>Nizivo UI</h1>
        <p className="nz-home-lede">
          An accessible, server-first React design system, built from the Nizivo design library.
          Tokens and components for Next.js, Vite and Astro.
        </p>
        <div className="nz-home-actions">
          <Link href="/docs/getting-started/next/" className="nz-home-cta">
            Get started
          </Link>
          <Link href="/docs/components/" className="nz-home-link">
            Browse components
          </Link>
        </div>
      </section>

      <section aria-labelledby="composition" className="not-prose">
        <h2 id="composition" className="nz-visually-hidden">
          Live composition
        </h2>
        <Composition />
        <p className="nz-home-note">
          Real components, rendered on the server. This composition ships no Nizivo JavaScript.
          Switch the theme to see every token follow.
        </p>
      </section>

      <Separator />

      <section className="nz-home-grid" aria-labelledby="principles">
        <h2 id="principles">Principles</h2>
        <ul>
          {PRINCIPLES.map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="nz-home-install" aria-labelledby="install">
        <h2 id="install">Install</h2>
        <ServerCodeBlock
          themes={CODE_THEMES}
          lang="sh"
          code="pnpm add @nizivo/react@next @nizivo/tokens@next"
        />
        <ServerCodeBlock
          themes={CODE_THEMES}
          lang="tsx"
          code={`// app/layout.tsx: the CSS, once\nimport '@nizivo/tokens/tokens.css';\nimport '@nizivo/react/css/base.css';\nimport '@nizivo/react/css/button.css';\n\n// any Server Component\nimport { Button } from '@nizivo/react/button';\n\n<Button variant="primary">Save</Button>`}
        />
      </section>
    </div>
  );
}

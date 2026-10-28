import type { JSX } from 'react';
import { Link } from '../link/index';
import { FeatureCard } from './index';

/** Stand-in for `@nizivo/icons` Sparkles (a Lucide stroke). */
function Sparkles(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  );
}

/** The three styles side by side: plain, tinted and inverse. */
export function FeatureCardExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {(['plain', 'tinted', 'inverse'] as const).map((variant) => (
        <FeatureCard
          key={variant}
          variant={variant}
          icon={<Sparkles />}
          title="Accessible by default"
          action={<Link href="/docs/accessibility/">Learn about accessibility</Link>}
        >
          Every colour pair passes WCAG 2.2 AA in Light and Dark, and focus is designed for every
          control.
        </FeatureCard>
      ))}
    </div>
  );
}

import type { JSX } from 'react';
import { DocsCard } from './index';

/** Stand-in for `@nizivo/icons` Layers (a Lucide stroke). */
function Layers(): JSX.Element {
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
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
}

/** An entry point on a docs home page: one link, named by its title. */
export function DocsCardExample(): JSX.Element {
  return (
    <div style={{ inlineSize: 300 }}>
      <DocsCard
        href="/docs/components/"
        icon={<Layers />}
        title="Components"
        description="Every control with props, states, code and keyboard notes."
        meta="114 components"
      />
    </div>
  );
}

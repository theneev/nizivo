// The MDX `<Cards>` and `<Card>` (Fumadocs' props: `title`, `href`, `description`, `icon`) drawn as
// the kit's Docs Card (Figma's Docs Card 7416:59; M90), as the home page's "Browse the docs" does:
// the Introduction's "Where to start" and the Components and Utilities overviews. A card without an
// icon keeps only its arrow, in the corner (global.css).
import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { DocsCard } from '@nizivo/react/unstable/docs-card';

export function Cards({ children }: { children?: ReactNode }): JSX.Element {
  return <div className="not-prose nz-docs-cards">{children}</div>;
}

export function Card({
  title,
  href,
  description,
  icon,
  children,
}: {
  title: ReactNode;
  href: string;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}): JSX.Element {
  return (
    <DocsCard
      title={title}
      description={description ?? children}
      icon={icon}
      data-icon={icon === undefined ? undefined : ''}
      href={href}
      {...(href.startsWith('/') && { render: <Link href={href} /> })}
    />
  );
}

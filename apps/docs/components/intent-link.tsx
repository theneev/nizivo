'use client';
// Every internal link on the site. Next.js prefetches a link as soon as it scrolls into view, which
// on a docs page means every sidebar link in the current section: /docs/components/button/ fetched
// 45 route payloads and 374 KB after its own load (Week 41). This link prefetches on intent instead:
// on hover, focus or touch, the pattern Next's docs give for it. `prefetch={false}` alone would also
// turn off prefetching on hover. The provider hands it to Fumadocs' sidebar, breadcrumbs and page
// cards (components/provider.tsx); the site's own components import it in place of next/link.
import type { ComponentProps, JSX } from 'react';
import { useState } from 'react';
import NextLink from 'next/link';

/** Fumadocs' link props: a plain anchor's, with `prefetch` (ignored here) and an optional `href`. */
type IntentLinkProps = ComponentProps<'a'> & { prefetch?: boolean };

export function IntentLink({
  href = '#',
  prefetch: _prefetch,
  onClick,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: IntentLinkProps): JSX.Element {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...props}
      {...(onClick !== undefined && { onClick })}
      href={href}
      prefetch={intent ? null : false}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}

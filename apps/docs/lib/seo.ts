// The site's search and share metadata (M90). Every page gets a canonical URL (with the trailing
// slash the static host serves), and Open Graph and Twitter tags carrying its own title and
// description and the share image, public/og.png (scripts/brand-assets.ts draws it). The image is
// named here, not left to Next's app/opengraph-image file: a page that sets its own openGraph
// replaces the inherited one, image included.
import type { Metadata } from 'next';

export const SITE_URL = 'https://nizivo.neevtechnologies.in';
export const SITE_NAME = 'Nizivo UI';
export const SITE_DESCRIPTION =
  'Nizivo UI: an accessible, server-first React design system by Neev Technologies. Design tokens, React Server Components, charts and icons for Next.js, Vite and Astro.';

/** The share image, 1200 × 630. */
export const SHARE_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'Nizivo UI: calm, accessible product UI for React',
} as const;

/** A path as the static host serves it: `/docs/components/button/`. */
export function canonicalPath(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/** A page's metadata: its title and description, canonical URL and share tags. */
export function pageMetadata({
  title,
  description,
  path,
  type = 'article',
}: {
  title: string;
  description: string | undefined;
  path: string;
  /** `website` for the home page. */
  type?: 'website' | 'article';
}): Metadata {
  const url = canonicalPath(path);
  return {
    title,
    ...(description === undefined ? {} : { description }),
    alternates: { canonical: url },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: 'en_US',
      url,
      title,
      ...(description === undefined ? {} : { description }),
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description === undefined ? {} : { description }),
      images: [SHARE_IMAGE],
    },
  };
}

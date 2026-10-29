// The home page (Figma's Website page, M90): every section is components/home.tsx, from Nizivo's own
// parts, with the numbers read from the repo at build time (lib/home.ts).
import type { Metadata } from 'next';
import type { JSX } from 'react';
import {
  Accessible,
  BrowseDocs,
  Closing,
  ColourPalette,
  DesignLanguage,
  GetStarted,
  Hero,
  HomeTicker,
  IconSet,
  Library,
  LivingSurfaces,
  Motion,
  Typography,
} from '../../components/home';
import { homeFacts } from '../../lib/home';
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../../lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Nizivo UI: calm, accessible product UI for React',
    description: SITE_DESCRIPTION,
    path: '/',
    type: 'website',
  }),
  // the home page's title stands alone, without the " · Nizivo UI" every other page adds
  title: { absolute: 'Nizivo UI: calm, accessible product UI for React' },
};

/** schema.org data for search: the site's name (Google's site name) and the publisher. */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  publisher: { '@type': 'Organization', name: 'Neev Technologies' },
};

export default function HomePage(): JSX.Element {
  const facts = homeFacts();
  return (
    // HomeLayout already renders <main>; this is the skip link's target.
    <div className="nz-home" id="content" tabIndex={-1}>
      <script
        type="application/ld+json"
        // JSON-LD is data, not markup; JSON.stringify escapes it, and "<" is escaped so no "</script>"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(STRUCTURED_DATA).replaceAll('<', String.raw`\u003c`),
        }}
      />
      <Hero facts={facts} />
      <HomeTicker facts={facts} />
      <GetStarted />
      <BrowseDocs facts={facts} />
      <DesignLanguage />
      <ColourPalette />
      <Typography />
      <Library facts={facts} />
      <LivingSurfaces facts={facts} />
      <Motion />
      <IconSet facts={facts} />
      <Accessible facts={facts} />
      <Closing />
    </div>
  );
}

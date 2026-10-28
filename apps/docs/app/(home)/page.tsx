// The home page (Figma's Website page, M90): every section is components/home.tsx, from Nizivo's own
// parts, with the numbers read from the repo at build time (lib/home.ts).
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

export default function HomePage(): JSX.Element {
  const facts = homeFacts();
  return (
    // HomeLayout already renders <main>; this is the skip link's target.
    <div className="nz-home" id="content" tabIndex={-1}>
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

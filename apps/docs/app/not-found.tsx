// The 404 page: out/404.html in the static export, which GitHub Pages and scripts/serve.ts send for
// any unknown path. Next's default page is unstyled and ignores the theme; this one uses the site's
// tokens. It is plain server markup on purpose: Next puts the root not-found tree into every page's
// RSC payload, so a client layout here (Fumadocs' HomeLayout) would add its JavaScript to every
// docs page (measured: about 9 KB gzip each).
import type { Metadata } from 'next';
import type { JSX } from 'react';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound(): JSX.Element {
  return (
    <main className="nz-home nz-not-found">
      <section className="nz-home-hero">
        <p className="nz-home-eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="nz-home-lede">
          This address has no page. It may have moved while the docs are pre-alpha.
        </p>
        <div className="nz-home-actions">
          <a href="/docs/" className="nz-home-cta">
            Read the docs
          </a>
          <a href="/" className="nz-home-link">
            Home
          </a>
        </div>
      </section>
    </main>
  );
}

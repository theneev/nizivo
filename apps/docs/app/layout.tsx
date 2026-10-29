// The root layout. Theme: <html data-nz-theme="system"> follows the OS with no script (a reader with
// JavaScript off included), and Nizivo's ThemeScript in <head> restores a stored choice before <body>
// exists, so there is no flash (lib/theme.ts). Fumadocs' theme switch then drives the `dark` class
// through next-themes, and `data-nz-theme` from the checked choice (components/provider.tsx). Nizivo's tokens resolve through
// `light-dark()` from that attribute (ARCHITECTURE.md §7.4), so the docs chrome and every live
// example switch together.
import './global.css';
import type { Metadata, Viewport } from 'next';
import type { JSX, ReactNode } from 'react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Provider } from '../components/provider';
import { ThemeScript } from '@nizivo/react/theme-script';
import { SHARE_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../lib/seo';

// The defaults every page inherits; each page sets its own title, description, canonical URL and share
// tags (lib/seo.ts). The tab icon, favicon.ico and the Apple touch icon are files in app/, which Next
// links from every page, and the share image is public/og.png (scripts/brand-assets.ts draws all four).
export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', images: [SHARE_IMAGE] },
  twitter: { card: 'summary_large_image', images: [SHARE_IMAGE] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#101311' },
  ],
};

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-nz-theme="system"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}

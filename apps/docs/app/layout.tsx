// The root layout. Theme: an inline script in <head> (lib/theme.ts) sets the `dark` class that
// Fumadocs' styles key on and Nizivo's own `data-nz-theme` attribute on <html> before <body> exists,
// so there is no flash. Fumadocs' theme switch then drives both through next-themes
// (components/provider.tsx). Nizivo's tokens resolve through `light-dark()` from that attribute
// (ARCHITECTURE.md §7.4), so the docs chrome and every live example switch together.
import './global.css';
import type { Metadata, Viewport } from 'next';
import type { JSX, ReactNode } from 'react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Provider } from '../components/provider';
import { THEME_SCRIPT } from '../lib/theme';

export const metadata: Metadata = {
  title: { default: 'Nizivo UI', template: '%s · Nizivo UI' },
  description:
    'Nizivo UI: an accessible, server-first React design system by Neev Technologies. React Server Components, Next.js, Vite and Astro.',
  metadataBase: new URL('https://nizivo.neevtechnologies.in'),
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
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}

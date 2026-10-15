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

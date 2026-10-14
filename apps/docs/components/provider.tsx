'use client';
// Fumadocs' root provider, configured for this site:
// - theme: next-themes writes the `dark` class (Fumadocs' styles) and `data-nz-theme` (Nizivo's
//   tokens, ARCHITECTURE.md §7.4) on <html>; lib/theme.ts sets both before first paint;
// - search: the static-index dialog (components/search-dialog.tsx) is a lazy module that is not
//   mounted until the reader first opens search (`preload: false`), so the search engine and its
//   index never load on a page view.
import type { JSX, ReactNode } from 'react';
import { lazy } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { THEME_ATTRIBUTES, THEME_STORAGE_KEY } from '../lib/theme';

const SearchDialog = lazy(() => import('./search-dialog'));

export function Provider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <RootProvider
      theme={{
        attribute: [...THEME_ATTRIBUTES],
        storageKey: THEME_STORAGE_KEY,
        defaultTheme: 'system',
        enableSystem: true,
      }}
      search={{ SearchDialog, preload: false }}
    >
      {children}
    </RootProvider>
  );
}

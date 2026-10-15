'use client';
// Fumadocs' root provider, configured for this site:
// - theme: next-themes writes the `dark` class (Fumadocs' styles) on <html> and stores the choice
//   under ThemeScript's key, which restores it before first paint; `data-nz-theme` (Nizivo's tokens,
//   ARCHITECTURE.md §7.4) is written below from the checked choice, never from next-themes' own
//   script (lib/theme.ts);
// - search: the static-index dialog (components/search-dialog.tsx) is a lazy module that is not
//   mounted until the reader first opens search (`preload: false`), so the search engine and its
//   index never load on a page view.
import type { JSX, ReactNode } from 'react';
import { lazy, useEffect } from 'react';
import { useTheme } from 'fumadocs-ui/provider/base';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, THEME_VALUES } from '../lib/theme';

const SearchDialog = lazy(() => import('./search-dialog'));

/**
 * After hydration, `data-nz-theme` follows the switch: the resolved `light` or `dark`. A stored value
 * ThemeScript ignored (not light, dark or system) is put back to `system`, as ThemeScript treated it.
 */
function NizivoTheme(): null {
  const { theme, resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    if (theme !== undefined && !THEME_VALUES.includes(theme)) setTheme('system');
    else if (resolvedTheme !== undefined) {
      document.documentElement.setAttribute('data-nz-theme', resolvedTheme);
    }
  }, [theme, resolvedTheme, setTheme]);
  return null;
}

export function Provider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <RootProvider
      theme={{
        attribute: THEME_ATTRIBUTE,
        storageKey: THEME_STORAGE_KEY,
        defaultTheme: 'system',
        enableSystem: true,
      }}
      search={{ SearchDialog, preload: false }}
    >
      <NizivoTheme />
      {children}
    </RootProvider>
  );
}
